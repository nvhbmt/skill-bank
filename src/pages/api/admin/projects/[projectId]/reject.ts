export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { rejectProject } from '@/services/admin';

export const PUT: APIRoute = async ({ params, locals }) => {
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

        const projectId = parseInt(params?.projectId || '0');
        if (isNaN(projectId) || projectId <= 0) {
            return httpResponse.fail('ID dự án không hợp lệ', 400);
        }

        const success = await rejectProject(projectId);

        if (!success) {
            return httpResponse.fail('Từ chối dự án thất bại', 500);
        }

        return httpResponse.ok(null, 'Từ chối dự án thành công', 200);
    } catch (error) {
        console.error('Error rejecting project:', error);
        return httpResponse.fail(
            'Lỗi khi từ chối dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
