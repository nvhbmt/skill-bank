export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
    // Get language from URL or default to 'vi'
    const pathname = url.pathname;
    const langMatch = pathname.match(/^\/(vi|en)/);
    const lang = langMatch ? langMatch[1] : 'vi';
    try {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Check for access_token in hash fragment (implicit flow fallback)
        const hash = url.hash;
        let accessTokenFromHash: string | null = null;
        if (hash) {
            const hashParams = new URLSearchParams(hash.substring(1));
            accessTokenFromHash = hashParams.get('access_token');
        }

        if (error) {
            console.error('OAuth error:', error, errorDescription);
            return redirect(`/${lang}/sign-in?error=oauth_failed`, 302);
        }

        let session;

        if (code) {
            // Authorization code flow - exchange code for session
            const { data, error: exchangeError } =
                await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError || !data.session) {
                console.error(
                    'Error exchanging code for session:',
                    exchangeError
                );
                return redirect(`/${lang}/sign-in?error=session_failed`, 302);
            }

            session = data.session;
        } else if (accessTokenFromHash) {
            // Implicit flow - use access_token directly
            // Note: This is less secure but needed if Supabase is configured for implicit flow
            try {
                // Get user info using the access token
                const { data: userData, error: userError } =
                    await supabase.auth.getUser(accessTokenFromHash);

                if (userError || !userData.user) {
                    console.error('Error getting user from token:', userError);
                    return redirect(
                        `/${lang}/sign-in?error=token_invalid`,
                        302
                    );
                }

                // Create a session manually (this is a workaround)
                // In production, prefer using authorization code flow
                const hashParams = new URLSearchParams(hash.substring(1));
                const refreshToken = hashParams.get('refresh_token') || '';
                const expiresAt = hashParams.get('expires_at');

                // Set session using setSession
                const { data: sessionData, error: sessionError } =
                    await supabase.auth.setSession({
                        access_token: accessTokenFromHash,
                        refresh_token: refreshToken,
                    });

                if (sessionError || !sessionData.session) {
                    console.error('Error setting session:', sessionError);
                    return redirect(
                        `/${lang}/sign-in?error=session_failed`,
                        302
                    );
                }

                session = sessionData.session;
            } catch (error) {
                console.error('Error processing hash token:', error);
                return redirect(
                    `/${lang}/sign-in?error=token_processing_failed`,
                    302
                );
            }
        } else {
            return redirect(`/${lang}/sign-in?error=no_code`, 302);
        }

        // Set cookies
        const { access_token, refresh_token } = session;
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
        const user = session.user;
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
