export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { upsertContract } from '@/services/contracts';
import httpResponse from '@/utils/response';

/** Chủ dự án lập hoặc cập nhật hợp đồng với một thành viên */
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
        const memberId = String(body.member_id ?? '').trim();
        const terms =
            typeof body.terms === 'string'
                ? body.terms.trim().slice(0, 5000)
                : '';
        const startDate = String(body.start_date ?? '').trim() || null;
        const endDate = String(body.end_date ?? '').trim() || null;

        if (!memberId) {
            return httpResponse.fail('Thiếu thành viên', 400);
        }
        if (!terms) {
            return httpResponse.fail('Vui lòng nhập điều khoản hợp đồng', 400);
        }
        if (startDate && endDate && endDate < startDate) {
            return httpResponse.fail(
                'Ngày kết thúc phải sau ngày bắt đầu',
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
        if (project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Chỉ chủ dự án mới lập được hợp đồng',
                403
            );
        }
        if (memberId === session.user.id) {
            return httpResponse.fail(
                'Không thể lập hợp đồng với chính mình',
                400
            );
        }

        const { data: membership } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', memberId)
            .is('deleted_at', null)
            .is('left_at', null)
            .maybeSingle();

        if (!membership) {
            return httpResponse.fail(
                'Người này không phải thành viên dự án',
                400
            );
        }

        const result = await upsertContract(supabase, {
            projectId,
            memberId,
            terms,
            startDate,
            endDate,
        });

        if (!result.ok) {
            return httpResponse.fail(
                'Lỗi khi lưu hợp đồng: ' + (result.error ?? ''),
                500
            );
        }

        return httpResponse.ok(
            { contract_id: result.id },
            'Đã lưu hợp đồng',
            200
        );
    } catch (error) {
        console.error('Error saving contract:', error);
        return httpResponse.fail('Lỗi khi lưu hợp đồng', 500);
    }
};
