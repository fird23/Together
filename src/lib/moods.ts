/**
 * Каталог настроений. Три группы; в каждой есть вариант по умолчанию (его ставит обычное нажатие)
 * и список для точного выбора (зажать кнопку). Значения id хранятся в базе (mood_entries.mood).
 */
export type MoodGroup = "positive" | "neutral" | "negative";

export type MoodDef = { id: string; label: string; group: MoodGroup; hue: string; emoji: string };

export const MOOD_GROUPS: { id: MoodGroup; label: string; short: string; defaultId: string }[] = [
  { id: "positive", label: "Положительное", short: "Хорошо", defaultId: "good" },
  { id: "neutral", label: "Нейтральное", short: "Ровно", defaultId: "calm" },
  { id: "negative", label: "Отрицательное", short: "Тяжело", defaultId: "sad" },
];

export const MOODS: MoodDef[] = [
  // Положительные
  { id: "good", label: "Хорошо", group: "positive", hue: "#6FAE6B", emoji: "😊" },
  { id: "great", label: "Прекрасно", group: "positive", hue: "#E9A93B", emoji: "🤩" },
  { id: "love", label: "Влюблён", group: "positive", hue: "#E5648A", emoji: "😍" },
  { id: "happy", label: "Счастье", group: "positive", hue: "#F0B33C", emoji: "😄" },
  { id: "joyful", label: "Радость", group: "positive", hue: "#F29B3E", emoji: "😁" },
  { id: "excited", label: "Восторг", group: "positive", hue: "#E86F5B", emoji: "🥳" },
  { id: "inspired", label: "Вдохновение", group: "positive", hue: "#8F7FD6", emoji: "✨" },
  { id: "grateful", label: "Благодарность", group: "positive", hue: "#58B39A", emoji: "🙏" },
  { id: "proud", label: "Гордость", group: "positive", hue: "#D9A63A", emoji: "😎" },
  { id: "playful", label: "Игривое", group: "positive", hue: "#4FB0A5", emoji: "😜" },
  { id: "energetic", label: "Бодрость", group: "positive", hue: "#7CB848", emoji: "💪" },
  { id: "cozy", label: "Уют", group: "positive", hue: "#D98E6A", emoji: "🥰" },
  { id: "tender", label: "Нежность", group: "positive", hue: "#E88FAE", emoji: "🫶" },
  { id: "confident", label: "Уверенность", group: "positive", hue: "#5E9BD6", emoji: "😌" },
  // Нейтральные
  { id: "calm", label: "Спокойно", group: "neutral", hue: "#6C8FD6", emoji: "😌" },
  { id: "tired", label: "Без сил", group: "neutral", hue: "#9A82C9", emoji: "😴" },
  { id: "miss", label: "Скучаю", group: "neutral", hue: "#B36BC9", emoji: "🥹" },
  { id: "thoughtful", label: "Задумчиво", group: "neutral", hue: "#7A93B8", emoji: "🤔" },
  { id: "bored", label: "Скучно", group: "neutral", hue: "#97A0AE", emoji: "😑" },
  { id: "sleepy", label: "Сонно", group: "neutral", hue: "#8C8CCB", emoji: "🥱" },
  { id: "curious", label: "Любопытно", group: "neutral", hue: "#58A6C7", emoji: "🧐" },
  { id: "surprised", label: "Удивление", group: "neutral", hue: "#E2A24A", emoji: "😲" },
  { id: "confused", label: "Растерянность", group: "neutral", hue: "#A58FC4", emoji: "😕" },
  { id: "nostalgic", label: "Ностальгия", group: "neutral", hue: "#C79A7C", emoji: "🌅" },
  { id: "indifferent", label: "Безразлично", group: "neutral", hue: "#8D97A6", emoji: "😐" },
  { id: "focused", label: "Сосредоточенно", group: "neutral", hue: "#5F8FAF", emoji: "🎯" },
  // Отрицательные
  { id: "sad", label: "Грустно", group: "negative", hue: "#D9708E", emoji: "🥺" },
  { id: "stressed", label: "Тревожно", group: "negative", hue: "#D98B5B", emoji: "😰" },
  { id: "angry", label: "Злой", group: "negative", hue: "#D8584E", emoji: "😠" },
  { id: "annoyed", label: "Раздражение", group: "negative", hue: "#D9764E", emoji: "😤" },
  { id: "lonely", label: "Одиноко", group: "negative", hue: "#7F8CC4", emoji: "😔" },
  { id: "hurt", label: "Обида", group: "negative", hue: "#C96B8A", emoji: "💔" },
  { id: "disappointed", label: "Разочарование", group: "negative", hue: "#A58A7C", emoji: "😞" },
  { id: "exhausted", label: "Выжато", group: "negative", hue: "#9E88B8", emoji: "😩" },
  { id: "overwhelmed", label: "Перегруз", group: "negative", hue: "#D68A52", emoji: "🤯" },
  { id: "afraid", label: "Страх", group: "negative", hue: "#8F83C7", emoji: "😨" },
  { id: "ashamed", label: "Стыд", group: "negative", hue: "#D97C7C", emoji: "😳" },
  { id: "jealous", label: "Ревность", group: "negative", hue: "#6FA06A", emoji: "😒" },
  { id: "guilty", label: "Вина", group: "negative", hue: "#B38C6B", emoji: "😓" },
  { id: "sick", label: "Нездоровится", group: "negative", hue: "#82A86A", emoji: "🤒" },
];

const BY_ID = new Map(MOODS.map((m) => [m.id, m]));
export const moodOf = (id?: string | null) => (id ? BY_ID.get(id) : undefined);
export const moodsOfGroup = (group: MoodGroup) => MOODS.filter((m) => m.group === group);
export const defaultMood = (group: MoodGroup) => moodOf(MOOD_GROUPS.find((g) => g.id === group)!.defaultId)!;
export const MOOD_HUES: Record<string, string> = Object.fromEntries(MOODS.map((m) => [m.id, m.hue]));
