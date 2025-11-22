export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { createAuthenticatedClient } from '@/lib/supabase';
import { z } from 'zod';
import httpResponse from '@/utils/response';

const setPasswordSchema = z
    .object({
        password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Mật khẩu xác nhận không khớp',
        path: ['confirmPassword'],
    });

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail(
                'Bạn cần xác thực OTP trước khi đặt mật khẩu mới',
                401
            );
        }

        const body = await request.json();
        const { password, confirmPassword } = body;

        // Validate input
        const validated = setPasswordSchema.safeParse({
            password,
            confirmPassword,
        });

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin không hợp lệ',
                400,
                validated.error.errors[0]?.message
            );
        }

        // Create authenticated Supabase client
        const authenticatedSupabase = createAuthenticatedClient(session);

        // Update password using Supabase auth
        const { error } = await authenticatedSupabase.auth.updateUser({
            password: validated.data.password,
        });

        if (error) {
            console.error('Error updating password:', error);
            return httpResponse.fail(
                'Không thể đặt mật khẩu mới. Vui lòng thử lại sau.',
                500
            );
        }

        return httpResponse.ok(
            null,
            'Đặt mật khẩu mới thành công',
            200
        );
    } catch (error) {
        console.error('Error in set password:', error);
        return httpResponse.fail(
            'Có lỗi xảy ra. Vui lòng thử lại sau.',
            500,
            (error as Error).message
        );
    }
};

