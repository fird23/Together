import { describe, expect, it } from "vitest";
import { addDays, addMonths, addYears, breakdown, daysTogether, pluralRu, todayISO } from "@/utils/days";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe("addDays", () => {
  it("переходит через границу месяца и года", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("учитывает високосный год", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("addMonths", () => {
  it("31 января + 1 месяц — это конец февраля, а не март", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("работает с отрицательными значениями и переходом года", () => {
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
  it("addYears из 29 февраля даёт 28 февраля в невисокосный год", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
  });
});

describe("daysTogether", () => {
  it("считает полные дни по календарю", () => {
    expect(daysTogether("2026-11-01", at(2026, 11, 18))).toBe(17);
  });
  it("в день начала — ноль, а дата в будущем не уходит в минус", () => {
    expect(daysTogether("2026-11-18", at(2026, 11, 18))).toBe(0);
    expect(daysTogether("2026-12-01", at(2026, 11, 18))).toBe(0);
  });
  it("считает год с учётом високосного дня", () => {
    expect(daysTogether("2023-11-18", at(2024, 11, 18))).toBe(366);
  });
});

describe("breakdown", () => {
  it("раскладывает на годы, месяцы и дни", () => {
    expect(breakdown("2024-09-10", at(2026, 11, 18))).toEqual({ years: 2, months: 2, days: 8 });
  });
  it("занимает дни из прошлого месяца, если день меньше", () => {
    expect(breakdown("2026-10-25", at(2026, 11, 18))).toEqual({ years: 0, months: 0, days: 24 });
  });
});

describe("pluralRu", () => {
  const forms: [string, string, string] = ["день", "дня", "дней"];
  it.each([[1, "день"], [2, "дня"], [4, "дня"], [5, "дней"], [11, "дней"], [12, "дней"], [21, "день"], [22, "дня"], [100, "дней"], [111, "дней"]])("%i → %s", (n, word) => {
    expect(pluralRu(n, forms)).toBe(word);
  });
});

describe("todayISO", () => {
  it("форматирует локальную дату с нулями", () => {
    expect(todayISO(at(2026, 3, 5))).toBe("2026-03-05");
  });
});
