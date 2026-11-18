import { describe, expect, it } from "vitest";
import { addDays } from "@/utils/days";
import {
  STREAK_GAP_DAYS, completionRate, computePairStreak, computeStreak, dueToday, isAutoFrozen, isoWeekday, scheduleKind, scheduleLabel, weekStart,
} from "@/utils/habit-stats";

const set = (...days: string[]) => new Set(days);
const none = new Set<string>();
// 18 ноября 2026 — среда
const TODAY = "2026-11-18";

describe("дни недели", () => {
  it("среда — третий день, неделя начинается в понедельник", () => {
    expect(isoWeekday(TODAY)).toBe(3);
    expect(weekStart(TODAY)).toBe("2026-11-16");
    expect(isoWeekday("2026-11-22")).toBe(7); // воскресенье
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
  });
});

describe("расписание", () => {
  it("определяет вид расписания", () => {
    expect(scheduleKind({})).toBe("daily");
    expect(scheduleKind({ week_days: [1, 2, 3, 4, 5, 6, 7] })).toBe("daily");
    expect(scheduleKind({ week_days: [1, 3] })).toBe("days");
    expect(scheduleKind({ per_week: 3 })).toBe("count");
  });
  it("делает короткие подписи", () => {
    expect(scheduleLabel({})).toBeNull();
    expect(scheduleLabel({ week_days: [1, 2, 3, 4, 5] })).toBe("По будням");
    expect(scheduleLabel({ week_days: [7, 6] })).toBe("По выходным");
    expect(scheduleLabel({ week_days: [1, 3] })).toBe("Пн, Ср");
    expect(scheduleLabel({ per_week: 3 })).toBe("3 раза в неделю");
    expect(scheduleLabel({ per_week: 5 })).toBe("5 раз в неделю");
  });
});

describe("автозаморозка", () => {
  it("пропущенный день после отметки заморожен", () => {
    expect(isAutoFrozen(set("2026-11-10"), "2026-11-12", TODAY)).toBe(true);
  });
  it("сегодня и будущее не замораживаются, отмеченный день тоже", () => {
    expect(isAutoFrozen(set("2026-11-10"), TODAY, TODAY)).toBe(false);
    expect(isAutoFrozen(set("2026-11-10"), "2026-11-19", TODAY)).toBe(false);
    expect(isAutoFrozen(set("2026-11-10"), "2026-11-10", TODAY)).toBe(false);
  });
  it("без отметки за последний месяц заморозки нет", () => {
    expect(isAutoFrozen(set("2026-08-01"), "2026-11-12", TODAY)).toBe(false);
    expect(STREAK_GAP_DAYS).toBe(30);
  });
});

describe("серия «каждый день»", () => {
  it("без отметок серии нет", () => {
    expect(computeStreak({}, none, none, TODAY)).toEqual({ current: 0, best: 0, unit: "days" });
  });
  it("сегодняшний день ещё не отмечен, а серия не рвётся", () => {
    const done = set("2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17");
    expect(computeStreak({}, done, none, TODAY)).toEqual({ current: 4, best: 4, unit: "days" });
  });
  it("пропущенные дни замораживаются сами, считаются только дни с отметкой", () => {
    const done = set("2026-11-10", "2026-11-11", "2026-11-15");
    expect(computeStreak({}, done, none, "2026-11-16")).toEqual({ current: 3, best: 3, unit: "days" });
  });
  it("больше месяца без отметок: серия сгорает, лучший результат остаётся", () => {
    expect(computeStreak({}, set("2026-09-01"), none, TODAY)).toEqual({ current: 0, best: 1, unit: "days" });
  });
  it("серия сгорает и тогда, когда отметок было много, но очень давно", () => {
    const done = set("2026-08-01", "2026-08-02", "2026-08-03");
    expect(computeStreak({}, done, none, TODAY).current).toBe(0);
    expect(computeStreak({}, done, none, TODAY).best).toBe(3);
  });
});

describe("серия «N раз в неделю»", () => {
  it("считает недели с выполненной нормой", () => {
    const done = set("2026-11-16", "2026-11-17");
    expect(computeStreak({ per_week: 2 }, done, none, TODAY)).toEqual({ current: 1, best: 1, unit: "weeks" });
  });
  it("неделя без нормы, пока не прошёл месяц, серию не обрывает", () => {
    const done = set("2026-11-09", "2026-11-10");
    expect(computeStreak({ per_week: 2 }, done, none, TODAY).current).toBe(1);
  });
});

describe("общая серия пары", () => {
  it("считает дни, когда отметили оба", () => {
    const a = set("2026-11-15", "2026-11-16", "2026-11-17");
    expect(computePairStreak({}, a, a, none, none, TODAY)).toBe(3);
  });
  it("один пропуск при живых отметках серию не обрывает", () => {
    const a = set("2026-11-15", "2026-11-16", "2026-11-17");
    const b = set("2026-11-15", "2026-11-17");
    expect(computePairStreak({}, a, b, none, none, TODAY)).toBe(2);
  });
  it("если у одного из двоих серия сгорела, общая равна нулю", () => {
    const a = set("2026-11-16", "2026-11-17");
    const b = set("2026-09-01");
    expect(computePairStreak({}, a, b, none, none, TODAY)).toBe(0);
  });
  it("для «N в неделю» общая серия не считается", () => {
    const a = set("2026-11-16");
    expect(computePairStreak({ per_week: 2 }, a, a, none, none, TODAY)).toBe(0);
  });
});

describe("dueToday", () => {
  it("каждый день — нужно всегда", () => {
    expect(dueToday({}, none, TODAY).due).toBe(true);
  });
  it("по дням недели — только в выбранные дни", () => {
    expect(dueToday({ week_days: [1, 3] }, none, TODAY).due).toBe(true); // среда
    expect(dueToday({ week_days: [1, 2] }, none, TODAY).due).toBe(false);
  });
  it("N в неделю — пока норма недели не выполнена", () => {
    expect(dueToday({ per_week: 2 }, set("2026-11-16"), TODAY)).toEqual({ due: true, weekDone: 1 });
    expect(dueToday({ per_week: 2 }, set("2026-11-16", "2026-11-17"), TODAY)).toEqual({ due: false, weekDone: 2 });
  });
});

describe("completionRate", () => {
  it("процент от плана за 30 дней", () => {
    expect(completionRate({}, set("2026-11-16", "2026-11-17", "2026-11-18"), TODAY)).toBe(10);
  });
  it("30 дней подряд — это 100 процентов", () => {
    const done = new Set<string>();
    for (let i = 0; i < 30; i++) done.add(addDays(TODAY, -i));
    expect(completionRate({}, done, TODAY)).toBe(100);
  });
});
