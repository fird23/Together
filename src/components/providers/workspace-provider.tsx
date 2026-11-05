"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { signOut as signOutService } from "@/services/auth";
import { SetupScreen } from "@/components/layout/setup-screen";
import type { Couple, Profile } from "@/types";

type Status = "loading" | "signed-out" | "ready" | "error";

type WorkspaceData = {
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
  memberCount: number;
};

const EMPTY: WorkspaceData = { profile: null, couple: null, partner: null, memberCount: 0 };

export type Workspace = WorkspaceData & {
  status: Status;
  session: Session | null;
  /** true после перехода по ссылке «восстановить пароль» */
  recovery: boolean;
  /** true, если человек сам нажал «Выйти» (тогда его не нужно отправлять на страницу входа) */
  wasExplicitSignOut: () => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace нужно вызывать внутри WorkspaceProvider");
  return value;
}

/**
 * Одно место, где приложение знает: кто вошёл, есть ли у него пара и кто партнёр.
 * Все страницы читают это состояние, а доступ к данным в любом случае защищён
 * политиками RLS в самой базе.
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [recovery, setRecovery] = useState(false);
  const requestId = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const explicitSignOut = useRef(false);

  const load = useCallback(async (current: Session) => {
    const client = supabase;
    if (!client) return;
    const id = ++requestId.current;
    try {
      const userId = current.user.id;
      const [profileRes, membershipRes] = await Promise.all([
        client.from("profiles").select("*").eq("id", userId).maybeSingle(),
        client.from("couple_members").select("couple_id").eq("user_id", userId).maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (membershipRes.error) throw membershipRes.error;

      let couple: Couple | null = null;
      let partner: Profile | null = null;
      let memberCount = 0;

      if (membershipRes.data) {
        const coupleId = membershipRes.data.couple_id as string;
        const [coupleRes, membersRes] = await Promise.all([
          client.from("couples").select("*").eq("id", coupleId).maybeSingle(),
          client.from("couple_members").select("user_id").eq("couple_id", coupleId),
        ]);
        if (coupleRes.error) throw coupleRes.error;
        if (membersRes.error) throw membersRes.error;
        couple = coupleRes.data as Couple | null;
        memberCount = membersRes.data?.length ?? 0;
        const partnerId = membersRes.data?.find((row) => row.user_id !== userId)?.user_id as string | undefined;
        if (partnerId) {
          const partnerRes = await client.from("profiles").select("*").eq("id", partnerId).maybeSingle();
          if (partnerRes.error) throw partnerRes.error;
          partner = partnerRes.data as Profile | null;
        }
      }

      if (id !== requestId.current) return; // пришёл более свежий запрос
      setData({ profile: profileRes.data as Profile | null, couple, partner, memberCount });
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
      sessionRef.current = next;
      setSession(next);

      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        router.push("/reset-password");
      }

      if (!next) {
        requestId.current++;
        setData(EMPTY);
        setStatus("signed-out");
        if (event === "SIGNED_OUT") setRecovery(false);
        return;
      }

      explicitSignOut.current = false;

      // Обновление токена данные не меняет.
      if (event === "TOKEN_REFRESHED") return;

      // Не показываем загрузку, если пользователь уже в приложении (например, вкладка снова стала активной).
      setStatus((prev) => (prev === "ready" ? prev : "loading"));
      // Запросы к базе нельзя делать прямо внутри этого колбэка — откладываем.
      setTimeout(() => void load(next), 0);
    });

    return () => listener.subscription.unsubscribe();
  }, [load, router]);

  const refresh = useCallback(async () => {
    if (sessionRef.current) await load(sessionRef.current);
  }, [load]);

  const signOut = useCallback(async () => {
    explicitSignOut.current = true; // ставим до выхода, чтобы AuthGate не увёл на /login
    await signOutService();
    router.replace("/");
  }, [router]);

  const wasExplicitSignOut = useCallback(() => explicitSignOut.current, []);

  const value = useMemo<Workspace>(
    () => ({ ...data, status, session, recovery, wasExplicitSignOut, refresh, signOut }),
    [data, status, session, recovery, wasExplicitSignOut, refresh, signOut],
  );

  if (!isSupabaseConfigured) return <SetupScreen />;
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** Куда вести человека после входа: пара есть — в пространство, нет — на подключение. */
export function homePathFor(workspace: Pick<Workspace, "couple">): string {
  return workspace.couple ? "/dashboard" : "/couple";
}
