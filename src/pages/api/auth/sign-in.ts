export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { signinSchema } from '@/schemas/auth';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const validated = signinSchema.safeParse(
            Object.fromEntries(await request.formData())
        );

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin đăng nhập không hợp lệ',
                400,
                normalizeZodError(validated)
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from('user_info')
            .select('email')
            .eq('username', validated.data.username)
            .single();

        if (profileError || !profile)
            throw new Error('Không tìm thấy username');
        const email = profile?.email;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: validated.data.password,
        });

        if (error || !data.session) {
            switch (error?.code) {
                case 'invalid_credentials':
                    return httpResponse.fail(
                        'Thông tin đăng nhập không hợp lệ',
                        400
                    );
                default:
                    return httpResponse.fail('Lỗi khi đăng nhập', 500);
            }
        }

        const { access_token, refresh_token } = data.session;
        cookies.set('sb-access-token', access_token, {
            path: '/',
        });
        cookies.set('sb-refresh-token', refresh_token, {
            path: '/',
        });
        return httpResponse.ok(null, 'Đăng nhập thành công', 200);
    } catch (error) {
        return httpResponse.fail(
            'Lỗi khi đăng nhập',
            500,
            (error as Error).message
        );
    }
};
