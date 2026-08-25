import type { ZodSafeParseError } from 'zod';

/**
 * Chuyển lỗi Zod thành map {tên trường: thông báo} cho client hiển thị.
 * Chỉ nhận nhánh thất bại của safeParse — gọi sau khi đã kiểm tra `!result.success`.
 */
function normalizeZodError<T>(
    zodSafeParseError: ZodSafeParseError<T>
): Record<string, string> {
    return zodSafeParseError.error.issues.reduce(
        (acc, curr) => {
            acc[curr.path[0] as string] = curr.message;
            return acc;
        },
        {} as Record<string, string>
    );
}

export default normalizeZodError;
