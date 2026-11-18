// Список настроений для уведомлений берётся из src/lib/moods.ts (единственный источник).
// Запуск: npm run sync:moods  (перепишет блок в supabase/functions/push-notify/index.ts)
//         npm run check:moods (только проверит, что блок актуален; для автопроверки на GitHub)
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "src/lib/moods.ts";
const TARGET = "supabase/functions/push-notify/index.ts";
const START = "// <generated:moods>";
const END = "// </generated:moods>";

const source = readFileSync(SOURCE, "utf8");
const pattern = /\{ id: "(\w+)", label: "([^"]+)", group: "\w+", hue: "#[0-9A-Fa-f]+", emoji: "([^"]+)" \}/g;
const moods = [...source.matchAll(pattern)].map(([, id, label, emoji]) => ({ id, label, emoji }));
if (moods.length < 10) {
  console.error(`Не удалось разобрать ${SOURCE}: найдено настроений: ${moods.length}`);
  process.exit(1);
}

const lines = moods.map((m) => `  ${m.id}: "${m.emoji} ${m.label}",`).join("\n");
const block = `${START}\n// Этот блок создаётся командой npm run sync:moods из src/lib/moods.ts, руками его не правьте.\nconst MOODS: Record<string, string> = {\n${lines}\n};\n${END}`;

const target = readFileSync(TARGET, "utf8");
const from = target.indexOf(START);
const to = target.indexOf(END);
if (from < 0 || to < 0) {
  console.error(`В ${TARGET} нет маркеров ${START} и ${END}`);
  process.exit(1);
}
const next = target.slice(0, from) + block + target.slice(to + END.length);

if (process.argv.includes("--check")) {
  if (next !== target) {
    console.error("Список настроений в push-notify устарел. Выполните: npm run sync:moods");
    process.exit(1);
  }
  console.log("Список настроений в push-notify актуален.");
} else {
  writeFileSync(TARGET, next);
  console.log(`Обновлено настроений: ${moods.length}`);
}
