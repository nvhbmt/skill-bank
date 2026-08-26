/**
 * Làm sạch từ khoá tìm kiếm trước khi ghép vào bộ lọc `.or()` của PostgREST.
 *
 * Chuỗi truyền cho `.or()` có dạng `cot.toantu.giatri,cot.toantu.giatri`, nên
 * nếu chèn thẳng input của người dùng vào thì một từ khoá chứa `,` `(` `)` sẽ
 * tự chèn thêm điều kiện lọc vào câu truy vấn, hoặc khiến PostgREST parse lỗi
 * và trả về 500. Các ký tự đại diện của LIKE (`%`, `_`) cũng bị loại bỏ để
 * người dùng không thể khớp toàn bộ bảng.
 */
export function sanitizeSearchQuery(raw: string, maxLength = 100): string {
    return raw
        .replace(/[,()%_\\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export default sanitizeSearchQuery;
