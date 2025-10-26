import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
    const { locals } = context;
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
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

    locals.session = data.session;

    // Otherwise, continue to the next middleware or page
    return next();
});
