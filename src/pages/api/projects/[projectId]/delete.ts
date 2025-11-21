export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const DELETE: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const authenticatedSupabase = createAuthenticatedClient(session);

        const projectId = parseInt(params?.projectId || '0');
        if (isNaN(projectId) || projectId <= 0) {
            return httpResponse.fail('ID dự án không hợp lệ', 400);
        }

        // Check if user is project owner
        const { data: project } = await authenticatedSupabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .is('deleted_at', null)
            .single();

        if (!project) {
            return httpResponse.fail('Dự án không tồn tại', 404);
        }

        if (project.owner_id !== session.user.id) {
            return httpResponse.fail('Bạn không có quyền xóa dự án này', 403);
        }

        // Soft delete project
        const { error } = await authenticatedSupabase
            .from('projects')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', projectId);

        if (error) {
            console.error('Error deleting project:', error);
            return httpResponse.fail('Xóa dự án thất bại', 500);
        }

        return httpResponse.ok(null, 'Xóa dự án thành công', 200);
    } catch (error) {
        console.error('Error deleting project:', error);
        return httpResponse.fail(
            'Lỗi khi xóa dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

