/**
 * Đọc một tham số số nguyên từ query string một cách an toàn.
 *
 * `parseInt('abc')` trả về NaN, và NaN lọt xuống `.range()` / `.limit()` của
 * Supabase sẽ làm PostgREST báo lỗi và endpoint trả về 500. Hàm này luôn trả
 * về số nguyên hợp lệ trong khoảng [min, max].
 */
export function parseIntParam(
    raw: string | null,
    fallback: number,
    { min = 0, max = 100 }: { min?: number; max?: number } = {}
): number {
    const parsed = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
}

export default parseIntParam;
