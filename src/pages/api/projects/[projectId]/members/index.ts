export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

/**
 * Rời dự án (tự mình) hoặc gỡ một thành viên (chủ dự án).
 *
 * Cột `project_members.left_at` trước đây chỉ xuất hiện trong bộ lọc
 * `is('left_at', null)` mà không có chỗ nào ghi vào — nghĩa là đã vào dự án
 * thì không ai rời được, chủ dự án cũng không gỡ được ai.
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
        // Không truyền member_id nghĩa là tự rời dự án
        const targetId = String(body.member_id ?? session.user.id).trim();

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

        const isSelf = targetId === session.user.id;
        const isOwner = project.owner_id === session.user.id;

        if (!isSelf && !isOwner) {
            return httpResponse.fail(
                'Chỉ chủ dự án mới gỡ được thành viên khác',
                403
            );
        }
        if (targetId === project.owner_id) {
            return httpResponse.fail(
                'Chủ dự án không thể rời dự án của mình',
                400
            );
        }
        if (project.status === 'completed') {
            return httpResponse.fail(
                'Dự án đã kết thúc, không thay đổi thành viên được',
                400
            );
        }

        const { data, error } = await supabase
            .from('project_members')
            .update({ left_at: new Date().toISOString() })
            .eq('project_id', projectId)
            .eq('user_id', targetId)
            .is('deleted_at', null)
            .is('left_at', null)
            .select('id');

        if (error) {
            return httpResponse.fail(
                'Lỗi khi cập nhật thành viên: ' + error.message,
                500
            );
        }
        if (!data || data.length === 0) {
            return httpResponse.fail(
                'Người này không phải thành viên đang hoạt động',
                404
            );
        }

        // Đơn ứng tuyển cũ trở lại trạng thái từ chối để người đó ứng tuyển lại được
        await supabase
            .from('applications')
            .update({ status: 'rejected' })
            .eq('project_id', projectId)
            .eq('applicant_id', targetId)
            .eq('status', 'approved')
            .is('deleted_at', null);

        return httpResponse.ok(
            { member_id: targetId },
            isSelf ? 'Đã rời dự án' : 'Đã gỡ thành viên khỏi dự án',
            200
        );
    } catch (error) {
        console.error('Error leaving project:', error);
        return httpResponse.fail('Lỗi khi cập nhật thành viên', 500);
    }
};
