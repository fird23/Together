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
