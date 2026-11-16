export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  /** Настоящее имя партнёра, если вы назвали его по-своему (тогда display_name это ваше имя для него). */
  real_name?: string;
};

export type CoupleFeatures = { habits?: boolean; wishlist?: boolean; todos?: boolean; talk?: boolean; gratitude?: boolean; weekly?: boolean; memories?: boolean; album?: boolean };

export type Couple = {
  id: string;
  start_date: string; // YYYY-MM-DD
  created_at: string;
  /** Какие необязательные блоки включены у пары. Не указано = включено. */
  features?: CoupleFeatures | null;
  /** Путь к общему фото на карточке «Мы вместе уже» и включено ли размытие. */
  hero_photo_path?: string | null;
  hero_photo_blur?: boolean;
  hero_photo_enabled?: boolean;
  /** Сила размытия фото в пикселях (0–24). Пусто — по старому переключателю. */
  hero_photo_blur_amount?: number | null;
};

/** Состояние приглашения, как его видит страница /invite/[token]. */
export type InviteState =
  | "valid" // можно принять
  | "own" // вы сами его создали
  | "in_couple" // вы уже состоите в паре
  | "expired" // срок вышел
  | "used" // уже принято
  | "revoked" // отменено создателем
  | "not_found"; // такой ссылки нет

export type InvitePreview = {
  state: InviteState;
  inviterName: string | null;
  startDate: string | null;
  expiresAt: string | null;
};

export type EventColor = "rose" | "amber" | "green" | "blue" | "violet" | "orange" | "teal" | "gray";

export type CalendarEvent = {
  id: string;
  couple_id: string;
  created_by: string | null;
  title: string;
  note: string | null;
  color: EventColor;
  start_day: string; // YYYY-MM-DD (у повтора: день именно этого повтора)
  end_day: string; // YYYY-MM-DD, включительно
  repeat?: EventRepeat;
  /** Время события (HH:MM). Пусто: пометка на весь день. */
  start_time?: string | null;
  end_time?: string | null;
  /** Начало и конец самой пометки (для повторов start_day/end_day описывают конкретный повтор). */
  series_start?: string;
  series_end?: string;
};
export type EventRepeat = "none" | "weekly" | "monthly" | "yearly";

export type TicketKind = "idea" | "bug" | "question" | "other";
export type TicketStatus = "new" | "in_progress" | "done" | "declined";

export type SupportTicket = {
  id: string;
  kind: TicketKind;
  message: string;
  status: TicketStatus;
  admin_reply: string | null;
  created_at: string;
  attachments?: string[] | null;
};

export type AlbumPhoto = {
  id: string;
  couple_id: string;
  uploaded_by: string;
  media_path: string;
  thumb_path: string;
  caption: string | null;
  taken_on: string; // YYYY-MM-DD
  created_at: string;
  /** Фото или видео (по умолчанию фото). */
  kind?: "photo" | "video";
  duration_sec?: number | null;
  size_bytes?: number | null;
};

export type AdminTicket = SupportTicket & {
  email: string | null;
  display_name: string | null;
  meta: Record<string, string> | null;
  updated_at: string;
};

export type AdminStats = {
  users: number;
  couples: number;
  couples_complete: number;
  new_users_7d: number;
  active_7d: number;
  active_30d: number;
  android_devices: number;
  web_push_users: number;
  tickets: Partial<Record<TicketStatus, number>>;
};

export type AuditEntry = {
  id: number;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type NotificationPrefs = {
  timezone: string;
  habits: boolean;
  habits_hour: number;
  dates: boolean;
  events: boolean;
  partner_mood: boolean;
  partner_habits: boolean;
};

export type Todo = {
  id: string;
  couple_id: string;
  created_by: string | null;
  title: string;
  assignee_id: string | null; // null = вы оба
  color?: EventColor | null;
  due_day: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
  /** Ручной порядок (меньше = выше). Нет, пока не применена миграция 022. */
  sort_order?: number;
};

export type TalkKind = "complain" | "say" | "ask" | "suggest";
export type TalkThread = { id: string; couple_id: string; author_id: string; kind: TalkKind; body: string; resolved: boolean; created_at: string; media_path?: string | null; edited_at?: string | null };
export type TalkReply = { id: string; thread_id: string; author_id: string; body: string; created_at: string; media_path?: string | null; edited_at?: string | null };

export type GratitudeNote = { id: string; user_id: string; day: string; text: string; created_at: string };

export type DayCount = { day: string; users: number };

export type AdminOverview = {
  users: { total: number; new_7d: number; new_30d: number; active_today: number; active_7d: number; active_30d: number; never_seen: number };
  couples: { total: number; complete: number; single: number; active_7d: number; active_30d: number };
  dau: DayCount[];
  signups: DayCount[];
  usage_7d: Record<string, number>;
  features_off: Record<string, number>;
  platforms: Record<string, number>;
  builds: { build: string; users: number }[];
  push: { android_devices: number; web_users: number; prefs_users: number; inbox_total: number; inbox_unread: number };
  storage: Record<string, { files: number; bytes: number }>;
  album: { photos: number; videos: number };
  support: { open: number; avg_reply_hours: number | null; oldest_open_days: number | null; by_status: Record<string, number> };
  errors: { last_24h: number; last_7d: number };
};

export type ErrorGroup = { message: string; n: number; users: number; last_at: string; path: string | null; build: string | null; stack: string | null };
