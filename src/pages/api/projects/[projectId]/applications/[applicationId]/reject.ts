export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { rejectApplication } from '@/services/project-handover';
import { notifyApplicationRejected } from '@/services/notifications';

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

        // Check if user is project owner and get project title
        const { data: project } = await authenticatedSupabase
            .from('projects')
            .select('owner_id, title')
            .eq('id', projectId)
            .single();

        if (!project || project.owner_id !== session.user.id) {
            return httpResponse.fail('Bạn không có quyền thực hiện thao tác này', 403);
        }

        // Get applicant info before rejecting
        const { data: application } = await authenticatedSupabase
            .from('applications')
            .select('applicant_id')
            .eq('id', applicationId)
            .single();

        const success = await rejectApplication(applicationId);

        if (!success) {
            return httpResponse.fail('Từ chối ứng viên thất bại', 500);
        }

        // Notify applicant
        if (application && project.title) {
            // Get language from request headers or default to 'vi'
            const acceptLanguage = request.headers.get('accept-language') || '';
            const lang = acceptLanguage.includes('en') ? 'en' : 'vi';

            await notifyApplicationRejected(
                application.applicant_id,
                projectId,
                project.title,
                lang,
                authenticatedSupabase
            );
        }

        return httpResponse.ok(null, 'Từ chối ứng viên thành công', 200);
    } catch (error) {
        console.error('Error rejecting application:', error);
        return httpResponse.fail(
            'Lỗi khi từ chối ứng viên: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

