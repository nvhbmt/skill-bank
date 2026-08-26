export const prerender = false;

import type { APIRoute } from 'astro';
import { createAnonClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ cookies, locals }) => {
    try {
        // Client riêng cho request này, không dùng chung singleton
        const anonClient = createAnonClient();

        await anonClient.auth.signOut();
        return httpResponse.ok(null, 'Đăng xuất thành công', 200);
    } catch (error) {
        return httpResponse.fail('Lỗi khi đăng xuất', 500);
    } finally {
        cookies.delete('sb-access-token', { path: '/' });
        cookies.delete('sb-refresh-token', { path: '/' });
        locals.session = null;
    }
};
