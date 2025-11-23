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

    // List of protected routes
    const protectedRoutes = ['/admin', '/user'];

    // Get the current route
    const currentPath = context.url.pathname;

    if (
        protectedRoutes.some((route) => currentPath.startsWith(route)) &&
        !user
    ) {
        // Redirect to login if not authenticated
        return new Response(null, {
            status: 302,
            headers: {
                Location: '/login',
            },
        });
    }

    locals.session = session;

    // Otherwise, continue to the next middleware or page
    return next();
});
