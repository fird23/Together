import { createElement } from "react";
import {
  Apple, Bed, BookOpen, Bike, Brain, Coffee, Droplets, Dumbbell, Flame, Footprints, Heart, Languages, Leaf, Moon, Music, PenLine, Phone, Pill, Salad,
  Smile, Sparkles, Sprout, Star, Sun, Timer, Utensils, Wallet, type LucideIcon,
} from "lucide-react";

/** Иконки для привычек. Ключ хранится в базе, поэтому ключи менять нельзя. */
export const HABIT_ICONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "sparkles", label: "Звёздочки", icon: Sparkles },
  { id: "droplets", label: "Вода", icon: Droplets },
  { id: "dumbbell", label: "Спорт", icon: Dumbbell },
  { id: "footprints", label: "Прогулка", icon: Footprints },
  { id: "bike", label: "Велосипед", icon: Bike },
  { id: "book", label: "Чтение", icon: BookOpen },
  { id: "brain", label: "Медитация", icon: Brain },
  { id: "moon", label: "Сон", icon: Moon },
  { id: "bed", label: "Отбой", icon: Bed },
  { id: "sun", label: "Утро", icon: Sun },
  { id: "apple", label: "Фрукты", icon: Apple },
  { id: "salad", label: "Здоровая еда", icon: Salad },
  { id: "utensils", label: "Готовка", icon: Utensils },
  { id: "coffee", label: "Кофе", icon: Coffee },
  { id: "pill", label: "Витамины", icon: Pill },
  { id: "heart", label: "Забота", icon: Heart },
  { id: "smile", label: "Настроение", icon: Smile },
  { id: "music", label: "Музыка", icon: Music },
  { id: "pen", label: "Дневник", icon: PenLine },
  { id: "languages", label: "Языки", icon: Languages },
  { id: "timer", label: "Фокус", icon: Timer },
  { id: "wallet", label: "Финансы", icon: Wallet },
  { id: "phone", label: "Позвонить", icon: Phone },
  { id: "leaf", label: "Природа", icon: Leaf },
  { id: "sprout", label: "Рост", icon: Sprout },
  { id: "flame", label: "Огонь", icon: Flame },
  { id: "star", label: "Звезда", icon: Star },
];

export const habitIcon = (id: string | null | undefined): LucideIcon => HABIT_ICONS.find((i) => i.id === id)?.icon ?? Sparkles;

/** Иконка привычки по ключу. Элемент создаётся через createElement, чтобы не плодить компоненты на лету. */
export function HabitIcon({ id, size = 16 }: { id: string | null | undefined; size?: number }) {
  return createElement(habitIcon(id), { size, "aria-hidden": true });
}
