export type ApiResponse<T = unknown> = {
    success: boolean;
    message?: string;
    data?: T;
    error?: string | Record<string, any>;
};

export function buildResponse<T>(
    success: boolean,
    {
        message,
        data,
        error,
        status = 200,
    }: {
        message?: string;
        data?: T;
        error?: string | Record<string, any>;
        status?: number;
    } = {}
): Response {
    const payload: ApiResponse<T> = {
        success,
        message,
        ...(data ? { data } : {}),
        ...(error ? { error } : {}),
    };

    return new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function ok<T>(data: T, message = 'OK', status = 200) {
    return buildResponse<T>(true, { data, message, status });
}

function fail(
    message = 'Error',
    status = 400,
    error?: string | Record<string, any>
) {
    return buildResponse(false, { message, error, status });
}

const httpResponse = {
    ok: ok,
    fail: fail,
};

export default httpResponse;
