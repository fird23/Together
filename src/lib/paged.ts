/**
 * Supabase отдаёт не больше 1000 строк за запрос и при этом не сообщает, что остальное обрезано.
 * Эта функция читает данные страницами, пока они не закончатся, поэтому длинная история
 * (отметки привычек за год, записи настроения) не теряется. Запрос должен иметь стабильный порядок (order).
 */
type PageResult = { data: unknown[] | null; error: { message: string } | null };

const PAGE = 1000;
const MAX_PAGES = 30; // защита от бесконечного цикла: 30 000 строк за один раз более чем достаточно

export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<PageResult>): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) return { rows, error: error.message };
    const chunk = (data ?? []) as T[];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return { rows, error: null };
}
