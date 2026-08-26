export const prerender = false;

import type { APIRoute } from 'astro';
import { createAnonClient, createAuthenticatedClient } from '@/lib/supabase';
import { ensureUserInfo } from '@/services/user-account';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Client riêng cho request này, không dùng chung singleton
        const anonClient = createAnonClient();

        const body = await request.json();
        const { access_token, refresh_token } = body;

        if (!access_token) {
            return httpResponse.fail('Access token is required', 400);
        }

        // Set session using the tokens
        const { data, error } = await anonClient.auth.setSession({
            access_token: access_token,
            refresh_token: refresh_token || '',
        });

        if (error || !data.session) {
            console.error('Error setting session:', error);
            return httpResponse.fail('Failed to create session', 500);
        }

        // Set cookies
        const {
            access_token: sessionAccessToken,
            refresh_token: sessionRefreshToken,
        } = data.session;
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

        // Tạo user_info nếu chưa có. Trước đây insert bằng client ẩn danh nên
        // RLS chặn im lặng, và username suy ra từ tên đầy đủ không chống trùng
        // trong khi cột này là UNIQUE.
        const authenticatedSupabase = createAuthenticatedClient(data.session);
        if (data.user) {
            const profile = await ensureUserInfo(
                authenticatedSupabase,
                data.user
            );
            if (!profile.ok) {
                console.error('Cannot create user_info:', profile.error);
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
