import type { ZodSafeParseResult } from 'zod';

function normalizeZodError<T>(
    zodSafeParseError: ZodSafeParseResult<T>
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
