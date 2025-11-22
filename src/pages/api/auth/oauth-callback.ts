export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const { access_token, refresh_token } = body;

        if (!access_token) {
            return httpResponse.fail('Access token is required', 400);
        }

        // Set session using the tokens
        const { data, error } = await supabase.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token || '',
        });

        if (error || !data.session) {
            console.error('Error setting session:', error);
            return httpResponse.fail('Failed to create session', 500);
        }

        // Set cookies
        const { access_token: sessionAccessToken, refresh_token: sessionRefreshToken } = data.session;
        cookies.set('sb-access-token', sessionAccessToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        cookies.set('sb-refresh-token', sessionRefreshToken, {
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
                    email: user.email,
                    username: username,
                    full_name: fullName,
                    avatar_url: user.user_metadata?.avatar_url || null,
                    role: 'user',
                });
            }
        }

        return httpResponse.ok(null, 'Login successful', 200);
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        return httpResponse.fail(
            'Error processing OAuth callback: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

