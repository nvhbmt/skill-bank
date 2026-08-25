import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const onRequest = defineMiddleware(async (context, next) => {
    const { locals, cookies } = context;

    // Read tokens from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    let session = null;
    let user = null;

    // If we have tokens, create a session
    if (accessToken && refreshToken) {
        // Create a new Supabase client for this request
        const supabase = createClient<Database>(
            import.meta.env.SUPABASE_URL,
            import.meta.env.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
            }
        );

        // Set session from cookies
        const { data: sessionData, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        if (!error && sessionData.session) {
            session = sessionData.session;
            user = sessionData.user;
        }
    }

    locals.session = session;

    // Danh sách route cần đăng nhập (đã bỏ tiền tố ngôn ngữ)
    const protectedRoutes = [
        '/admin',
        '/dashboard',
        '/create-project',
        '/my-project',
        '/edit-profile',
        '/change-password',
        '/project-handover-manager',
    ];

    // Route thực tế luôn có tiền tố ngôn ngữ (/vi/..., /en/...) nên phải tách
    // ra trước khi so khớp, nếu không điều kiện này không bao giờ đúng.
    const currentPath = context.url.pathname;
    const segments = currentPath.split('/').filter(Boolean);
    const lang = segments[0] === 'en' ? 'en' : 'vi';
    const pathWithoutLang =
        segments[0] === 'vi' || segments[0] === 'en'
            ? `/${segments.slice(1).join('/')}`
            : currentPath;

    if (
        protectedRoutes.some(
            (route) =>
                pathWithoutLang === route ||
                pathWithoutLang.startsWith(`${route}/`)
        ) &&
        !user
    ) {
        // Chưa đăng nhập thì đưa về trang đăng nhập đúng ngôn ngữ
        return new Response(null, {
            status: 302,
            headers: {
                Location: `/${lang}/sign-in`,
            },
        });
    }

    // Otherwise, continue to the next middleware or page
    return next();
});
