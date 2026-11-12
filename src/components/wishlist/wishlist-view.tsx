"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, ExternalLink, Gift, ImagePlus, Link2, Loader2, Lock, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Illustration } from "@/components/ui/illustrations";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { getShareWishlistMarks } from "@/services/privacy";
import { removeTalkImages, talkImageUrls, uploadTalkImage } from "@/services/talk-media";
import { useRealtime } from "@/hooks/use-realtime";
import { ViewableImage } from "@/components/ui/viewable-image";

type Wish = {
  id: string; owner_id: string; title: string; details: string | null;
  link: string | null; media_path: string | null; created_at: string;
};
type Attachment = { blob: Blob; preview: string };

/** Приводит ссылку к виду https://… и пропускает только http/https. Пустая строка → null. */
function normalizeLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
  return url.href;
}
const hostOf = (href: string) => { try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return href; } };

/** Форма желания: используется и для добавления, и для редактирования. */
function WishForm({ initial, submitLabel, busy, onSubmit, onCancel }: {
  initial?: Wish;
  submitLabel: string;
  busy: boolean;
  onSubmit: (v: { title: string; details: string; link: string; photo: Attachment | null; removePhoto: boolean }) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (initial?.media_path) void talkImageUrls([initial.media_path]).then((m) => { if (alive) setExistingUrl(m[initial.media_path!] ?? null); });
    return () => { alive = false; };
  }, [initial?.media_path]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    try {
      const blob = await compressImage(file, { maxSide: 1200, maxBytes: 400 * 1024 });
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setRemovePhoto(false);
    } catch (err) { setPhotoError(err instanceof Error ? err.message : "Не удалось добавить фото."); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await onSubmit({ title, details, link, photo, removePhoto });
    if (ok && !initial) { setTitle(""); setDetails(""); setLink(""); setPhoto(null); setRemovePhoto(false); }
  }

  const shownPhoto = photo?.preview ?? (!removePhoto ? existingUrl : null);

  return (
    <form className="wishlist-form" onSubmit={submit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Чего бы мне хотелось?" aria-label="Желание" required />
      <input value={details} onChange={(e) => setDetails(e.target.value)} maxLength={240} placeholder="Комментарий" aria-label="Комментарий к желанию" />
      <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="Ссылка на товар (необязательно)" aria-label="Ссылка на желание" />
      {shownPhoto && (
        <div className="talk-attach">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shownPhoto} alt="Фото к желанию" />
          <button type="button" aria-label="Убрать фото" onClick={() => { setPhoto(null); setRemovePhoto(true); }}><X size={14} /></button>
        </div>
      )}
      <div className="wishlist-form-actions">
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={pick} />
        <button type="button" className="talk-attach-btn" onClick={() => fileInput.current?.click()}><ImagePlus size={15} />{shownPhoto ? "Заменить фото" : "Фото"}</button>
        <span className="flex-1" />
        {onCancel && <button type="button" className="wishlist-cancel" onClick={onCancel}>Отмена</button>}
        <button type="submit" className="wishlist-submit" disabled={!title.trim() || busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : initial ? <Check size={15} /> : <Plus size={15} />}{busy ? "Сохраняем…" : submitLabel}
        </button>
      </div>
      {photoError && <p role="alert" className="text-sm text-danger">{photoError}</p>}
    </form>
  );
}

export function WishlistView() {
  const { couple, profile, partner } = useWorkspace();
  const [items, setItems] = useState<Wish[]>([]);
  /** Мои личные отметки на желаниях партнёра. Сами отметки лежат в wishlist_private_marks, партнёр их не видит. */
  const [marks, setMarks] = useState<Set<string>>(new Set());
  /** Отметки партнёра на моих желаниях: приходят только если партнёр разрешил их показывать. */
  const [partnerMarks, setPartnerMarks] = useState<Set<string>>(new Set());
  /** Разрешил ли я партнёру видеть мои отметки (настройки → Приватность). */
  const [shareMine, setShareMine] = useState(false);
  const [tab, setTab] = useState<"mine" | "partner">("mine");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!supabase || !couple || !profile) return;
    const { data, error: err } = await supabase
      .from("wishlist_items")
      .select("id,owner_id,title,details,link,media_path,created_at")
      .eq("couple_id", couple.id)
      .order("created_at", { ascending: false });
    if (err) { setError("Не удалось загрузить списки. Примените миграцию 020_mood_angry_wishlist_extras.sql."); return; }
    setItems((data ?? []) as Wish[]);
    const { data: markRows, error: markErr } = await supabase
      .from("wishlist_private_marks")
      .select("wishlist_item_id")
      .eq("user_id", profile.id);
    if (markErr) { setError("Не удалось загрузить ваши отметки. Примените миграцию 007_private_wishlist_marks.sql."); return; }
    setMarks(new Set((markRows ?? []).map((r) => r.wishlist_item_id as string)));

    // Необязательные данные: если миграция 021 ещё не применена, список всё равно работает.
    if (partner) {
      const { data: theirRows } = await supabase.from("wishlist_private_marks").select("wishlist_item_id").eq("user_id", partner.id);
      setPartnerMarks(new Set((theirRows ?? []).map((r) => r.wishlist_item_id as string)));
    }
    setShareMine(await getShareWishlistMarks(profile.id).catch(() => false));
  }, [couple, profile, partner]);

  useEffect(() => { void load(); }, [load]);
  useRealtime("wishlist_items", load, { filter: couple ? `couple_id=eq.${couple.id}` : undefined, enabled: Boolean(couple) });

  // Временные ссылки на фото (бакет закрытый).
  useEffect(() => {
    const missing = items.map((i) => i.media_path).filter((p): p is string => Boolean(p) && !urls[p as string]);
    if (missing.length === 0) return;
    let alive = true;
    void talkImageUrls(missing).then((m) => { if (alive) setUrls((old) => ({ ...old, ...m })); });
    return () => { alive = false; };
  }, [items, urls]);

  const mine = items.filter((x) => x.owner_id === profile?.id);
  const theirs = items.filter((x) => x.owner_id === partner?.id);
  const visible = tab === "mine" ? mine : theirs;
  const markedCount = theirs.filter((x) => marks.has(x.id)).length;

  /** Общая часть добавления и правки: проверяет ссылку, грузит фото, пишет в базу. */
  async function save(
    values: { title: string; details: string; link: string; photo: Attachment | null; removePhoto: boolean },
    existing?: Wish,
  ): Promise<boolean> {
    if (!supabase || !couple || !profile || !values.title.trim()) return false;
    let link: string | null;
    try { link = normalizeLink(values.link); }
    catch { setError("Ссылка выглядит неверно. Пример: https://example.com/товар"); return false; }

    setSaving(true); setError("");
    let uploaded: string | null = null;
    try {
      let mediaPath = existing?.media_path ?? null;
      if (values.photo) { uploaded = await uploadTalkImage(couple.id, values.photo.blob); mediaPath = uploaded; }
      else if (values.removePhoto) mediaPath = null;

      const fields = { title: values.title.trim(), details: values.details.trim() || null, link, media_path: mediaPath };
      const { error: err } = existing
        ? await supabase.from("wishlist_items").update(fields).eq("id", existing.id)
        : await supabase.from("wishlist_items").insert({ couple_id: couple.id, owner_id: profile.id, ...fields });
      if (err) throw err;

      if (existing?.media_path && existing.media_path !== mediaPath) await removeTalkImages([existing.media_path]).catch(() => {});
      setEditing(null);
      await load();
      return true;
    } catch (e) {
      if (uploaded) await removeTalkImages([uploaded]).catch(() => {});
      setError(e instanceof Error && e.message.includes("фото") ? e.message : existing ? "Не удалось сохранить изменения." : "Не удалось добавить желание.");
      return false;
    } finally { setSaving(false); }
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
    if (!window.confirm(`Удалить «${item.title}»?`)) return;
    setBusy(item.id);
    const { error: err } = await supabase.from("wishlist_items").delete().eq("id", item.id);
    if (err) setError("Не удалось удалить пункт.");
    else {
      if (item.media_path) await removeTalkImages([item.media_path]).catch(() => {});
      await load();
    }
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
            {shareMine
              ? <><strong>Партнёр видит ваши отметки.</strong> Отключить можно в настройках, в разделе «Приватность».</>
              : <><strong>Отметки видите только вы.</strong> Партнёр не узнает, какие желания вы отметили, — сюрприз останется сюрпризом.</>}
            {theirs.length > 0 && <em> Отмечено: {markedCount} из {theirs.length}</em>}
          </span>
        </p>
      )}

      {tab === "mine" && <WishForm submitLabel="Добавить" busy={saving && editing === null} onSubmit={(v) => save(v)} />}

      <div className="wishlist-list">
        {visible.length === 0 ? (
          <div className="wishlist-empty">
            <Illustration kind="wishlist" />
            <p>{tab === "mine" ? "Ваш список пока пуст. Добавьте первое желание." : "У партнёра пока нет желаний в списке."}</p>
          </div>
        ) : visible.map((item) => {
          if (tab === "mine" && editing === item.id) {
            return (
              <article className="wishlist-item is-editing" key={item.id}>
                <WishForm initial={item} submitLabel="Сохранить" busy={saving} onSubmit={(v) => save(v, item)} onCancel={() => setEditing(null)} />
              </article>
            );
          }
          const marked = tab === "partner" && marks.has(item.id);
          const photoUrl = item.media_path ? urls[item.media_path] : undefined;
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
                {item.link && (
                  <a className="wishlist-link" href={item.link} target="_blank" rel="noopener noreferrer nofollow">
                    <Link2 size={12} /><span>{hostOf(item.link)}</span><ExternalLink size={11} />
                  </a>
                )}
                {photoUrl && (
                  <ViewableImage className="wishlist-photo" src={photoUrl} alt={`Фото: ${item.title}`} />
                )}
                {marked && <em><Lock size={10} /> {shareMine ? "Партнёр видит вашу отметку" : "Отметка только для вас"}</em>}
                {tab === "mine" && partnerMarks.has(item.id) && <em><Check size={10} /> {partner?.display_name ?? "Партнёр"} отметил(а) это желание</em>}
              </div>
              {tab === "mine" && (
                <div className="wishlist-actions">
                  <button type="button" onClick={() => setEditing(item.id)} disabled={busy === item.id} aria-label={`Изменить ${item.title}`}><Pencil size={15} /></button>
                  <button type="button" className="wishlist-delete" onClick={() => void remove(item)} disabled={busy === item.id} aria-label={`Удалить ${item.title}`}><Trash2 size={15} /></button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {tab === "mine" && mine.length > 0 && (
        <p className="wishlist-footnote">Партнёр видит ваш список и может отмечать желания для себя. Отметки видны вам, только если партнёр разрешил это в своих настройках.</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
