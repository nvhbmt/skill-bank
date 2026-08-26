export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { resolveDispute } from '@/services/disputes';
import httpResponse from '@/utils/response';

/** Quản trị viên xử lý một khiếu nại */
export const PUT: APIRoute = async ({ request, params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: userInfo } = await supabase
            .from('user_info')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (userInfo?.role !== 'admin') {
            return httpResponse.fail('Bạn không có quyền truy cập', 403);
        }

        const disputeId = Number.parseInt(params.disputeId ?? '', 10);
        if (!Number.isFinite(disputeId)) {
            return httpResponse.fail('Khiếu nại không hợp lệ', 400);
        }

        const body = await request.json().catch(() => ({}));
        const action = body.action;
        if (action !== 'resolve' && action !== 'reject') {
            return httpResponse.fail('Hành động không hợp lệ', 400);
        }

        const ok = await resolveDispute(
            supabase,
            disputeId,
            session.user.id,
            action === 'resolve' ? 'resolved' : 'rejected'
        );

        if (!ok) {
            return httpResponse.fail('Không tìm thấy khiếu nại', 404);
        }

        return httpResponse.ok(
            { status: action === 'resolve' ? 'resolved' : 'rejected' },
            action === 'resolve'
                ? 'Đã xử lý khiếu nại'
                : 'Đã từ chối khiếu nại',
            200
        );
    } catch (error) {
        console.error('Error resolving dispute:', error);
        return httpResponse.fail('Lỗi khi xử lý khiếu nại', 500);
    }
};
