export const prerender = false;

import { createAnonClient, createAuthenticatedClient } from '@/lib/supabase';
import { ensureUserInfo } from '@/services/user-account';
import { signupSchema } from '@/schemas/auth';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Client riêng cho request này, không dùng chung singleton
        const anonClient = createAnonClient();

        const validated = signupSchema.safeParse(
            Object.fromEntries(
                (await request.formData()) as unknown as [string, string][]
            )
        );

        if (!validated.success) {
            return httpResponse.fail(
                'Tạo tài khoản thất bại',
                400,
                normalizeZodError(validated)
            );
        }

        const { data: exists } = await anonClient
            .from('user_info')
            .select('user_id')
            .eq('username', validated.data.username)
            .maybeSingle();

        if (exists) {
            return httpResponse.fail('Username đã tồn tại', 400);
        }

        const { error, data } = await anonClient.auth.signUp({
            email: validated.data.email,
            password: validated.data.password,
            options: {
                data: {
                    username: validated.data.username,
                    role: 'user',
                    full_name: validated.data.fullName,
                },
            },
        });

        if (error) {
            switch (error.code) {
                case 'user_already_exists':
                    return httpResponse.fail('Email đã được sử dụng', 400);
                default:
                    return httpResponse.fail(error.message, 500);
            }
        }

        if (!data.session || !data.user) {
            return httpResponse.fail('Lỗi khi tạo tài khoản', 500);
        }

        // Bắt buộc tạo bản ghi user_info: đăng nhập tra cứu email theo username
        // qua bảng này, thiếu nó là tài khoản vừa đăng ký không đăng nhập lại
        // được. Dùng client đã có phiên để không bị RLS chặn.
        const authenticatedSupabase = createAuthenticatedClient(data.session);
        const profile = await ensureUserInfo(authenticatedSupabase, {
            ...data.user,
            user_metadata: {
                ...data.user.user_metadata,
                username: validated.data.username,
                full_name: validated.data.fullName,
            },
        });

        if (!profile.ok) {
            return httpResponse.fail(
                'Tạo tài khoản thất bại: ' + (profile.error ?? ''),
                500
            );
        }

        // Cùng cấu hình cookie với /api/auth/sign-in: thiếu httpOnly thì
        // JavaScript đọc được token, thiếu maxAge thì phiên mất khi đóng trình duyệt.
        const { access_token, refresh_token } = data.session;
        cookies.set('sb-access-token', access_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 ngày
        });
        cookies.set('sb-refresh-token', refresh_token, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 ngày
        });
        return httpResponse.ok(null, 'Tạo tài khoản thành công', 200);
    } catch (error) {
        return httpResponse.fail('Lỗi khi tạo tài khoản', 500);
    }
};
