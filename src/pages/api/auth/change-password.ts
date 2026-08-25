export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase, createAuthenticatedClient } from '@/lib/supabase';
import { changePasswordSchema } from '@/schemas/auth';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';

/**
 * Đổi mật khẩu cho người dùng đang đăng nhập.
 * Bắt buộc nhập đúng mật khẩu hiện tại trước khi cho đổi.
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const validated = changePasswordSchema.safeParse(
            Object.fromEntries(await request.formData())
        );

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin không hợp lệ',
                400,
                normalizeZodError(validated)
            );
        }

        const { currentPassword, password } = validated.data;

        if (currentPassword === password) {
            return httpResponse.fail(
                'Mật khẩu mới phải khác mật khẩu hiện tại',
                400,
                { password: 'Mật khẩu mới phải khác mật khẩu hiện tại' }
            );
        }

        const email = session.user.email;
        if (!email) {
            return httpResponse.fail(
                'Tài khoản không có email, không thể đổi mật khẩu',
                400
            );
        }

        // Xác minh mật khẩu hiện tại bằng cách đăng nhập lại
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email,
            password: currentPassword,
        });

        if (verifyError) {
            return httpResponse.fail('Mật khẩu hiện tại không đúng', 400, {
                currentPassword: 'Mật khẩu hiện tại không đúng',
            });
        }

        const authenticatedSupabase = createAuthenticatedClient(session);
        const { error } = await authenticatedSupabase.auth.updateUser({
            password,
        });

        if (error) {
            console.error('Error changing password:', error);
            return httpResponse.fail(
                'Không thể đổi mật khẩu. Vui lòng thử lại sau.',
                500
            );
        }

        return httpResponse.ok(null, 'Đổi mật khẩu thành công', 200);
    } catch (error) {
        console.error('Error in change password:', error);
        return httpResponse.fail(
            'Có lỗi xảy ra. Vui lòng thử lại sau.',
            500,
            (error as Error).message
        );
    }
};
