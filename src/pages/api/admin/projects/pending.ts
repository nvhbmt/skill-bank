export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { getPendingProjects } from '@/services/admin';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        // Check if user is admin
        const authenticatedSupabase = createAuthenticatedClient(session);
        const { data: userInfo } = await authenticatedSupabase
            .from('user_info')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

        if (userInfo?.role !== 'admin') {
            return httpResponse.fail('Bạn không có quyền truy cập', 403);
        }

        const projects = await getPendingProjects();

        return httpResponse.ok(
            projects,
            'Lấy danh sách dự án chờ duyệt thành công',
            200
        );
    } catch (error) {
        console.error('Error fetching pending projects:', error);
        return httpResponse.fail(
            'Lỗi khi lấy danh sách dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
