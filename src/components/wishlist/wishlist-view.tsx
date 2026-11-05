"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Gift, Loader2, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";

type Wish = { id: string; owner_id: string; title: string; details: string | null; created_at: string };

export function WishlistView() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Wish[]>([]);
  /** Мои личные отметки на желаниях партнёра. Сами отметки лежат в wishlist_private_marks, партнёр их не видит. */
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"mine" | "partner">("mine");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase || !couple || !profile) return;
    const { data, error: err } = await supabase
      .from("wishlist_items")
      .select("id,owner_id,title,details,created_at")
      .eq("couple_id", couple.id)
      .order("created_at", { ascending: false });
    if (err) { setError("Не удалось загрузить списки. Проверьте миграцию 006_wishlist.sql."); return; }
    setItems((data ?? []) as Wish[]);
    const { data: markRows, error: markErr } = await supabase
      .from("wishlist_private_marks")
      .select("wishlist_item_id")
      .eq("user_id", profile.id);
    if (markErr) { setError("Не удалось загрузить ваши отметки. Примените миграцию 007_private_wishlist_marks.sql."); return; }
    setMarks(new Set((markRows ?? []).map((r) => r.wishlist_item_id as string)));
  }, [couple, profile]);

  useEffect(() => { void load(); }, [load]);

  const mine = items.filter((x) => x.owner_id === profile?.id);
  const theirs = items.filter((x) => x.owner_id === partner?.id);
  const visible = tab === "mine" ? mine : theirs;
  const markedCount = theirs.filter((x) => marks.has(x.id)).length;

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !couple || !profile || !title.trim()) return;
    setAdding(true); setError("");
    const { error: err } = await supabase.from("wishlist_items").insert({ couple_id: couple.id, owner_id: profile.id, title: title.trim(), details: details.trim() || null });
    if (err) setError("Не удалось добавить желание.");
    else { setTitle(""); setDetails(""); await load(); }
    setAdding(false);
  }

  async function toggle(item: Wish) {
    if (!supabase || !profile) return;
    setBusy(item.id); setError("");
    const marked = marks.has(item.id);
    const { error: err } = marked
      ? await supabase.from("wishlist_private_marks").delete().eq("wishlist_item_id", item.id).eq("user_id", profile.id)
      : await supabase.from("wishlist_private_marks").insert({ wishlist_item_id: item.id, user_id: profile.id });
    if (err) setError("Не удалось обновить отметку.");
    else setMarks((old) => { const next = new Set(old); if (marked) next.delete(item.id); else next.add(item.id); return next; });
    setBusy(null);
  }

  async function remove(item: Wish) {
    if (!supabase) return;
    setBusy(item.id);
    const { error: err } = await supabase.from("wishlist_items").delete().eq("id", item.id);
    if (err) setError("Не удалось удалить пункт.");
    else await load();
    setBusy(null);
  }

  return (
    <section className="dashboard-card wishlist-card">
      <div className="wishlist-heading">
        <div className="flex items-center gap-3">
          <span className="dashboard-icon icon-peach"><Gift size={19} /></span>
          <div>
            <h2 className="font-serif text-xl font-semibold">Наши вишлисты</h2>
            <p className="text-sm text-ink-soft">Желания, которыми хочется делиться</p>
          </div>
        </div>
        <span className="wishlist-count"><Sparkles size={13} />{mine.length + theirs.length} желаний</span>
      </div>

      <div className="wishlist-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>Мой список <span>{mine.length}</span></button>
        <button role="tab" aria-selected={tab === "partner"} className={tab === "partner" ? "active" : ""} onClick={() => setTab("partner")}>Список партнёра <span>{theirs.length}</span></button>
      </div>

      {tab === "partner" && (
        <p className="wishlist-privacy" role="note">
          <Lock size={14} />
          <span>
            <strong>Отметки видите только вы.</strong> Партнёр не узнает, какие желания вы отметили, — сюрприз останется сюрпризом.
            {theirs.length > 0 && <em> Отмечено: {markedCount} из {theirs.length}</em>}
          </span>
        </p>
      )}

      {tab === "mine" && (
        <form className="wishlist-add-form" onSubmit={add}>
          <div className="wishlist-inputs">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Чего бы мне хотелось?" aria-label="Новое желание" required />
            <input value={details} onChange={(e) => setDetails(e.target.value)} maxLength={240} placeholder="Комментарий (необязательно)" aria-label="Комментарий к желанию" />
          </div>
          <button disabled={!title.trim() || adding} type="submit"><Plus size={16} />{adding ? "Добавляем…" : "Добавить"}</button>
        </form>
      )}

      <div className="wishlist-list">
        {visible.length === 0 ? (
          <div className="wishlist-empty">
            <Gift size={22} />
            <p>{tab === "mine" ? "Ваш список пока пуст. Добавьте первое желание." : "У партнёра пока нет желаний в списке."}</p>
          </div>
        ) : visible.map((item) => {
          const marked = tab === "partner" && marks.has(item.id);
          return (
            <article className={`wishlist-item ${marked ? "is-completed" : ""}`} key={item.id}>
              {tab === "partner" ? (
                <button type="button" className={`wishlist-check ${marked ? "checked" : ""}`} onClick={() => void toggle(item)} disabled={busy === item.id}
                  aria-pressed={marked} aria-label={marked ? "Снять личную отметку" : "Поставить личную отметку"}>
                  {busy === item.id ? <Loader2 size={15} className="animate-spin" /> : marked ? <Check size={15} /> : null}
                </button>
              ) : (
                <span className="wishlist-bullet" aria-hidden="true"><Gift size={14} /></span>
              )}
              <div className="wishlist-item-copy">
                <strong>{item.title}</strong>
                {item.details && <small>{item.details}</small>}
                {marked && <em><Lock size={10} /> Отметка только для вас</em>}
              </div>
              {tab === "mine" && (
                <button type="button" className="wishlist-delete" onClick={() => void remove(item)} disabled={busy === item.id} aria-label="Удалить желание"><Trash2 size={15} /></button>
              )}
            </article>
          );
        })}
      </div>

      {tab === "mine" && mine.length > 0 && (
        <p className="wishlist-footnote">Партнёр видит ваш список и может отмечать желания для себя — вы этих отметок не увидите.</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
