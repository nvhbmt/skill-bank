export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { createDispute } from '@/services/disputes';
import httpResponse from '@/utils/response';

/**
 * Thành viên (hoặc chủ dự án) báo cáo vấn đề trên một dự án.
 * Quản trị viên xử lý ở /[lang]/admin, tab Khiếu nại.
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
        const description =
            typeof body.description === 'string' ? body.description.trim() : '';

        if (!description) {
            return httpResponse.fail('Vui lòng mô tả vấn đề', 400);
        }
        if (description.length > 3000) {
            return httpResponse.fail(
                'Nội dung không được vượt quá 3000 ký tự',
                400
            );
        }

        const supabase = createAuthenticatedClient(session);

        const { data: project } = await supabase
            .from('projects')
            .select('id, owner_id')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }

        // Chỉ người trong dự án mới báo cáo được
        const { data: membership } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .is('left_at', null)
            .maybeSingle();

        if (!membership && project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Chỉ thành viên dự án mới báo cáo được',
                403
            );
        }

        // Mỗi người chỉ giữ một khiếu nại đang mở trên mỗi dự án
        const { data: existing } = await supabase
            .from('disputes')
            .select('id')
            .eq('project_id', projectId)
            .eq('raised_by_id', session.user.id)
            .eq('status', 'open')
            .is('deleted_at', null)
            .maybeSingle();

        if (existing) {
            return httpResponse.fail(
                'Bạn đã có một báo cáo đang chờ xử lý cho dự án này',
                400
            );
        }

        const result = await createDispute(supabase, {
            projectId,
            raisedById: session.user.id,
            description,
        });

        if (!result.ok) {
            return httpResponse.fail(
                'Lỗi khi gửi báo cáo: ' + (result.error ?? ''),
                500
            );
        }

        return httpResponse.ok(
            { dispute_id: result.id },
            'Đã gửi báo cáo tới quản trị viên',
            200
        );
    } catch (error) {
        console.error('Error creating dispute:', error);
        return httpResponse.fail('Lỗi khi gửi báo cáo', 500);
    }
};
