export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ cookies, locals }) => {
    try {
        await supabase.auth.signOut();
        return httpResponse.ok(null, 'Đăng xuất thành công', 200);
    } catch (error) {
        return httpResponse.fail('Lỗi khi đăng xuất', 500);
    } finally {
        cookies.delete('sb-access-token', { path: '/' });
        cookies.delete('sb-refresh-token', { path: '/' });
        locals.session = null;
    }
};
