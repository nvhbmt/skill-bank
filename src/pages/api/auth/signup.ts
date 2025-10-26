export const prerender = false;

import { supabase } from '@/lib/supabase';
import { signupSchema } from '@/schemas/auth';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const validated = signupSchema.safeParse(
            Object.fromEntries(await request.formData())
        );

        if (!validated.success) {
            return httpResponse.fail(
                'Tạo tài khoản thất bại',
                400,
                normalizeZodError(validated)
            );
        }

        const { data: exists } = await supabase
            .from('user_info')
            .select('user_id')
            .eq('username', validated.data.username)
            .maybeSingle();

        if (exists) {
            return httpResponse.fail('Username đã tồn tại', 400);
        }

        const { error, data } = await supabase.auth.signUp({
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
                    return httpResponse.fail('Username đã tồn tại', 400);
                default:
                    return httpResponse.fail(error.message, 500);
            }
        }

        if (!data.session) {
            return httpResponse.fail('Lỗi khi tạo tài khoản', 500);
        }

        const { access_token, refresh_token } = data.session;
        cookies.set('sb-access-token', access_token, {
            path: '/',
        });
        cookies.set('sb-refresh-token', refresh_token, {
            path: '/',
        });
        return httpResponse.ok(null, 'Tạo tài khoản thành công', 200);
    } catch (error) {
        return httpResponse.fail('Lỗi khi tạo tài khoản', 500);
    }
};
