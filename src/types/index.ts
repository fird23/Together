export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
};

export type Couple = {
  id: string;
  start_date: string; // YYYY-MM-DD
  created_at: string;
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
  start_day: string; // YYYY-MM-DD
  end_day: string; // YYYY-MM-DD, включительно
};

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
