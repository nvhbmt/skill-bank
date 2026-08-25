export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import httpResponse from '@/utils/response';

const forgotPasswordSchema = z.object({
    email: z.email('Email không hợp lệ'),
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();
        const email = formData.get('email') as string;

        // Validate email
        const validated = forgotPasswordSchema.safeParse({ email });

        if (!validated.success) {
            return httpResponse.fail(
                'Email không hợp lệ',
                400,
                validated.error.message
            );
        }

        // Check if email exists in user_info table
        const { data: userInfo, error: userError } = await supabase
            .from('user_info')
            .select('email, user_id')
            .eq('email', validated.data.email)
            .is('deleted_at', null)
            .maybeSingle();

        if (userError || !userInfo) {
            return httpResponse.fail('Email không tồn tại trong hệ thống', 404);
        }

        // Send password reset email via Supabase
        const { error } = await supabase.auth.signInWithOtp({
            email: validated.data.email,
            options: {
                shouldCreateUser: false,
            },
        });

        if (error) {
            console.error('Error sending password reset email:', error);
            return httpResponse.fail(
                'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.',
                500
            );
        }

        return httpResponse.ok(
            null,
            'Chúng tôi đã gửi mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.',
            200
        );
    } catch (error) {
        console.error('Error in forgot password:', error);
        return httpResponse.fail(
            'Có lỗi xảy ra. Vui lòng thử lại sau.',
            500,
            (error as Error).message
        );
    }
};
