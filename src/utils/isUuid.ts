/**
 * Kiểm tra một chuỗi có phải UUID hợp lệ không.
 *
 * Dùng để chặn injection khi giá trị được ghép vào bộ lọc `.or()` của
 * PostgREST (ví dụ id người đối thoại trong nhắn tin). Một chuỗi chứa dấu
 * `)` `(` `,` có thể đóng nhóm điều kiện và chèn nhánh lọc mới, làm lộ dữ
 * liệu của người khác.
 */
export function isUuid(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value
        )
    );
}

export default isUuid;
