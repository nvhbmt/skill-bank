export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ cookies, locals }) => {
    try {
        // Phải signOut trên client có phiên thì Supabase mới thu hồi refresh
        // token. Gọi trên client ẩn danh (không có phiên) là vô nghĩa, token
        // vẫn dùng lại được sau khi người dùng bấm đăng xuất.
        const session = locals.session;
        if (session) {
            const authenticatedSupabase = createAuthenticatedClient(session);
            await authenticatedSupabase.auth.signOut();
        }

        return httpResponse.ok(null, 'Đăng xuất thành công', 200);
    } catch (error) {
        return httpResponse.fail('Lỗi khi đăng xuất', 500);
    } finally {
        cookies.delete('sb-access-token', { path: '/' });
        cookies.delete('sb-refresh-token', { path: '/' });
        locals.session = null;
    }
};
