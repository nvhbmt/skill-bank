export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { approveApplication } from '@/services/project-handover';

export const PUT: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const authenticatedSupabase = createAuthenticatedClient(session);

        const projectId = parseInt(params?.projectId || '0');
        const applicationId = parseInt(params?.applicationId || '0');

        if (isNaN(projectId) || projectId <= 0) {
            return httpResponse.fail('ID dự án không hợp lệ', 400);
        }

        if (isNaN(applicationId) || applicationId <= 0) {
            return httpResponse.fail('ID đơn ứng tuyển không hợp lệ', 400);
        }

        // Check if user is project owner
        const { data: project } = await authenticatedSupabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .single();

        if (!project || project.owner_id !== session.user.id) {
            return httpResponse.fail('Bạn không có quyền thực hiện thao tác này', 403);
        }

        const success = await approveApplication(applicationId, projectId);

        if (!success) {
            return httpResponse.fail('Duyệt ứng viên thất bại', 500);
        }

        return httpResponse.ok(null, 'Duyệt ứng viên thành công', 200);
    } catch (error) {
        console.error('Error approving application:', error);
        return httpResponse.fail(
            'Lỗi khi duyệt ứng viên: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

