export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
    // Get language from URL or default to 'vi'
    const pathname = url.pathname;
    const langMatch = pathname.match(/^\/(vi|en)/);
    const lang = langMatch ? langMatch[1] : 'vi';
    try {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
            console.error('OAuth error:', error, errorDescription);
            return redirect(`/${lang}/sign-in?error=oauth_failed`, 302);
        }

        if (!code) {
            return redirect(`/${lang}/sign-in?error=no_code`, 302);
        }

        // Exchange code for session
        const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError || !data.session) {
            console.error('Error exchanging code for session:', exchangeError);
            return redirect(`/${lang}/sign-in?error=session_failed`, 302);
        }

        // Set cookies
        const { access_token, refresh_token } = data.session;
        cookies.set('sb-access-token', access_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        cookies.set('sb-refresh-token', refresh_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Check if user exists in user_info table, if not create it
        const user = data.user;
        if (user && user.email) {
            const { data: existingUser } = await supabase
                .from('user_info')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!existingUser) {
                // Create user_info entry for OAuth user
                const username =
                    user.user_metadata?.username ||
                    user.user_metadata?.full_name
                        ?.toLowerCase()
                        .replace(/\s+/g, '') ||
                    `user_${user.id.slice(0, 8)}`;

                const fullName =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    'User';

                await supabase.from('user_info').insert({
                    user_id: user.id,
                    email: user.email, // Now guaranteed to be string
                    username: username,
                    full_name: fullName,
                    avatar_url: user.user_metadata?.avatar_url || null,
                    role: 'user',
                });
            }
        }

        return redirect(`/${lang}/`, 302);
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        return redirect(`/${lang}/sign-in?error=callback_failed`, 302);
    }
};
