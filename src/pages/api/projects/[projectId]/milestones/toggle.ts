export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

/**
 * Chủ dự án đánh dấu một mốc đã hoàn thành hoặc bỏ đánh dấu.
 * Tiến độ dự án được tính từ tỉ lệ mốc đã hoàn thành.
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const projectId = Number.parseInt(params.projectId ?? '', 10);
        if (!Number.isFinite(projectId)) {
            return httpResponse.fail('Dự án không hợp lệ', 400);
        }

        const body = await request.json().catch(() => ({}));
        const milestoneId = Number.parseInt(
            String(body.milestone_id ?? ''),
            10
        );
        if (!Number.isFinite(milestoneId)) {
            return httpResponse.fail('Mốc không hợp lệ', 400);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id, status')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }
        if (project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Chỉ chủ dự án mới cập nhật được mốc tiến độ',
                403
            );
        }

        const { data: milestone } = await supabase
            .from('project_milestones')
            .select('id, completed_at')
            .eq('id', milestoneId)
            .eq('project_id', projectId)
            .maybeSingle();

        if (!milestone) {
            return httpResponse.fail('Không tìm thấy mốc', 404);
        }

        const completedAt = milestone.completed_at
            ? null
            : new Date().toISOString();

        const { data, error } = await supabase
            .from('project_milestones')
            .update({ completed_at: completedAt })
            .eq('id', milestoneId)
            .select('id');

        if (error || !data || data.length === 0) {
            return httpResponse.fail(
                'Lỗi khi cập nhật mốc: ' + (error?.message ?? ''),
                500
            );
        }

        return httpResponse.ok(
            { milestone_id: milestoneId, completed: Boolean(completedAt) },
            completedAt ? 'Đã đánh dấu hoàn thành' : 'Đã bỏ đánh dấu',
            200
        );
    } catch (error) {
        console.error('Error toggling milestone:', error);
        return httpResponse.fail(
            'Lỗi khi cập nhật mốc: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
