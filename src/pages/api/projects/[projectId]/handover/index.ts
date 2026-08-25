export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { notifyHandoverSubmitted } from '@/services/notifications';
import httpResponse from '@/utils/response';

/**
 * Thành viên gửi (hoặc gửi lại) bản bàn giao cho dự án mình tham gia.
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
        const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

        if (!notes) {
            return httpResponse.fail('Vui lòng nhập ghi chú bàn giao', 400);
        }
        if (notes.length > 5000) {
            return httpResponse.fail(
                'Ghi chú bàn giao không được vượt quá 5000 ký tự',
                400
            );
        }

        const supabase = createAuthenticatedClient(session);

        // Chỉ thành viên đang hoạt động của dự án mới được bàn giao
        const { data: membership } = await supabase
            .from('project_members')
            .select('id, role')
            .eq('project_id', projectId)
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .is('left_at', null)
            .maybeSingle();

        if (!membership) {
            return httpResponse.fail(
                'Bạn không phải thành viên của dự án này',
                403
            );
        }

        const { data: project } = await supabase
            .from('projects')
            .select('id, title, owner_id')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }

        if (project.owner_id === session.user.id) {
            return httpResponse.fail('Chủ dự án không cần gửi bàn giao', 400);
        }

        // Gửi lại sẽ ghi đè bản cũ và đưa về trạng thái chờ duyệt
        const { data: handover, error } = await supabase
            .from('project_handovers')
            .upsert(
                {
                    project_id: projectId,
                    member_id: session.user.id,
                    notes,
                    status: 'pending',
                    submitted_at: new Date().toISOString(),
                    reviewed_at: null,
                    reviewed_by: null,
                    review_note: null,
                },
                { onConflict: 'project_id,member_id' }
            )
            .select('id')
            .single();

        if (error || !handover) {
            return httpResponse.fail(
                'Lỗi khi gửi bàn giao: ' + error?.message,
                500
            );
        }

        // Báo cho chủ dự án
        const { data: memberInfo } = await supabase
            .from('user_info')
            .select('full_name, username')
            .eq('user_id', session.user.id)
            .maybeSingle();

        await notifyHandoverSubmitted(
            project.owner_id,
            memberInfo?.full_name || memberInfo?.username || 'Thành viên',
            projectId,
            project.title
        );

        return httpResponse.ok(
            { handover_id: handover.id },
            'Gửi bàn giao thành công',
            200
        );
    } catch (error) {
        console.error('Error submitting handover:', error);
        return httpResponse.fail(
            'Lỗi khi gửi bàn giao: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
