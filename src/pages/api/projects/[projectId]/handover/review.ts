export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { recordDelivery } from '@/services/contracts';
import {
    notifyHandoverApproved,
    notifyHandoverRejected,
} from '@/services/notifications';
import httpResponse from '@/utils/response';

/**
 * Chủ dự án nghiệm thu hoặc trả lại một bản bàn giao.
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
        const handoverId = Number.parseInt(String(body.handover_id ?? ''), 10);
        const action = body.action;
        const reviewNote =
            typeof body.review_note === 'string'
                ? body.review_note.trim().slice(0, 2000)
                : null;

        if (!Number.isFinite(handoverId)) {
            return httpResponse.fail('Bản bàn giao không hợp lệ', 400);
        }
        if (action !== 'approve' && action !== 'reject') {
            return httpResponse.fail('Hành động không hợp lệ', 400);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: project } = await supabase
            .from('projects')
            .select('id, title, owner_id')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }
        if (project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Chỉ chủ dự án mới được duyệt bàn giao',
                403
            );
        }

        const { data: handover } = await supabase
            .from('project_handovers')
            .select('id, member_id, status, notes')
            .eq('id', handoverId)
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!handover) {
            return httpResponse.fail('Không tìm thấy bản bàn giao', 404);
        }

        // Chỉ xử lý bàn giao đang chờ. Không có chốt này, gọi duyệt lại một bản
        // đã approved sẽ chạy lại recordDelivery và tạo dòng deliveries trùng.
        if (handover.status !== 'pending') {
            return httpResponse.fail('Bàn giao này đã được xử lý', 400);
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        const { error } = await supabase
            .from('project_handovers')
            .update({
                status: newStatus,
                reviewed_at: new Date().toISOString(),
                reviewed_by: session.user.id,
                review_note: reviewNote,
            })
            .eq('id', handoverId);

        if (error) {
            return httpResponse.fail(
                'Lỗi khi duyệt bàn giao: ' + error.message,
                500
            );
        }

        if (action === 'approve') {
            // Ghi nhận chính thức vào hợp đồng của thành viên (nếu có hợp đồng)
            await recordDelivery(supabase, {
                projectId,
                memberId: handover.member_id,
                description: handover.notes,
            });

            await notifyHandoverApproved(
                handover.member_id,
                projectId,
                project.title
            );
        } else {
            await notifyHandoverRejected(
                handover.member_id,
                projectId,
                project.title
            );
        }

        return httpResponse.ok(
            { status: newStatus },
            action === 'approve'
                ? 'Đã nghiệm thu bàn giao'
                : 'Đã trả lại bàn giao',
            200
        );
    } catch (error) {
        console.error('Error reviewing handover:', error);
        return httpResponse.fail(
            'Lỗi khi duyệt bàn giao: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
