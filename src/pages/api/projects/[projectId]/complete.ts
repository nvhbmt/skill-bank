export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { endProjectContracts } from '@/services/contracts';
import { notifyProjectCompleted } from '@/services/notifications';
import httpResponse from '@/utils/response';

/**
 * Chủ dự án kết thúc dự án.
 *
 * Trước đây trạng thái 'completed' chỉ được đọc (tab "Hoàn thành" ở trang Dự án
 * của tôi) mà không có chỗ nào ghi, nên tab đó luôn rỗng và không ai đánh giá
 * được ai — đánh giá chỉ mở sau khi dự án kết thúc.
 */
export const POST: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const projectId = Number.parseInt(params.projectId ?? '', 10);
        if (!Number.isFinite(projectId)) {
            return httpResponse.fail('Dự án không hợp lệ', 400);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: project } = await supabase
            .from('projects')
            .select('id, title, owner_id, status')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }
        if (project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Chỉ chủ dự án mới kết thúc được dự án',
                403
            );
        }
        if (project.status === 'completed') {
            return httpResponse.fail('Dự án đã kết thúc', 400);
        }
        if (project.status !== 'approved') {
            return httpResponse.fail(
                'Chỉ dự án đã được duyệt mới kết thúc được',
                400
            );
        }

        const { data, error } = await supabase
            .from('projects')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', projectId)
            .select('id');

        if (error || !data || data.length === 0) {
            return httpResponse.fail(
                'Lỗi khi kết thúc dự án: ' + (error?.message ?? ''),
                500
            );
        }

        // Dự án đóng thì hợp đồng cũng đóng theo
        await endProjectContracts(supabase, projectId);

        // Báo cho các thành viên để họ vào đánh giá
        const { data: members } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .is('left_at', null);

        await Promise.all(
            (members || [])
                .filter((m) => m.user_id !== session.user.id)
                .map((m) =>
                    notifyProjectCompleted(m.user_id, projectId, project.title)
                )
        );

        return httpResponse.ok(
            { project_id: projectId },
            'Đã kết thúc dự án',
            200
        );
    } catch (error) {
        console.error('Error completing project:', error);
        return httpResponse.fail(
            'Lỗi khi kết thúc dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
