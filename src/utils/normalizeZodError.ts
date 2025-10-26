import type { ZodSafeParseError } from 'zod';

function normalizeZodError(
    zodSafeParseError: ZodSafeParseError<unknown>
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
