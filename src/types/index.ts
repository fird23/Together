export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type CoupleFeatures = { habits?: boolean; wishlist?: boolean; todos?: boolean; talk?: boolean; gratitude?: boolean; weekly?: boolean };

export type Couple = {
  id: string;
  start_date: string; // YYYY-MM-DD
  created_at: string;
  /** Какие необязательные блоки включены у пары. Не указано = включено. */
  features?: CoupleFeatures | null;
  /** Путь к общему фото на карточке «Мы вместе уже» и включено ли размытие. */
  hero_photo_path?: string | null;
  hero_photo_blur?: boolean;
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
  due_day: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
};

export type TalkKind = "complain" | "say" | "ask" | "suggest";
export type TalkThread = { id: string; couple_id: string; author_id: string; kind: TalkKind; body: string; resolved: boolean; created_at: string };
export type TalkReply = { id: string; thread_id: string; author_id: string; body: string; created_at: string };

export type GratitudeNote = { id: string; user_id: string; day: string; text: string; created_at: string };
