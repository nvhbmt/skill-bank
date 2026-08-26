export const prerender = false;

import type { APIRoute } from 'astro';
import { createAnonClient } from '@/lib/supabase';
import { z } from 'zod';
import httpResponse from '@/utils/response';

const verifyOtpSchema = z.object({
    email: z.email('Email không hợp lệ'),
    token: z.string().length(6, 'Mã OTP phải có 6 chữ số'),
});

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Client riêng cho request này, không dùng chung singleton
        const anonClient = createAnonClient();

        const body = await request.json();
        const { email, token } = body;

        // Validate input
        const validated = verifyOtpSchema.safeParse({ email, token });

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin không hợp lệ',
                400,
                validated.error.issues[0]?.message
            );
        }

        // Verify OTP with Supabase
        const { data, error } = await anonClient.auth.verifyOtp({
            email: validated.data.email,
            token: validated.data.token,
            type: 'email',
        });

        if (error || !data.session) {
            console.error('Error verifying OTP:', error);
            return httpResponse.fail(
                'Mã OTP không hợp lệ hoặc đã hết hạn',
                400
            );
        }

        // Set session cookies
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

        return httpResponse.ok(
            {
                user_id: data.user?.id,
            },
            'Xác thực OTP thành công',
            200
        );
    } catch (error) {
        console.error('Error in verify OTP:', error);
        return httpResponse.fail(
            'Có lỗi xảy ra. Vui lòng thử lại sau.',
            500,
            (error as Error).message
        );
    }
};
