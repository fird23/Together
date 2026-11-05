import { createClient } from "@supabase/supabase-js";

// Supabase поддерживает и старые anon-ключи, и новые publishable-ключи.
// Подойдёт любой, который скопирован из панели Supabase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function db() {
  if (!supabase) throw new Error("Supabase не настроен.");
  return supabase;
}
