export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

/**
 * Ứng viên rút đơn của chính mình khi đơn còn đang chờ duyệt.
 * Trước đây nộp đơn xong chỉ có thể ngồi chờ, không có đường rút lại.
 */
export const POST: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const applicationId = Number.parseInt(params.applicationId ?? '', 10);
        if (!Number.isFinite(applicationId)) {
            return httpResponse.fail('Đơn ứng tuyển không hợp lệ', 400);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: application } = await supabase
            .from('applications')
            .select('id, applicant_id, status')
            .eq('id', applicationId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!application) {
            return httpResponse.fail('Không tìm thấy đơn ứng tuyển', 404);
        }
        if (application.applicant_id !== session.user.id) {
            return httpResponse.fail('Đây không phải đơn của bạn', 403);
        }
        if (application.status !== 'pending') {
            return httpResponse.fail('Chỉ rút được đơn đang chờ duyệt', 400);
        }

        const { data, error } = await supabase
            .from('applications')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', applicationId)
            .select('id');

        if (error || !data || data.length === 0) {
            return httpResponse.fail(
                'Lỗi khi rút đơn: ' + (error?.message ?? ''),
                500
            );
        }

        return httpResponse.ok(null, 'Đã rút đơn ứng tuyển', 200);
    } catch (error) {
        console.error('Error withdrawing application:', error);
        return httpResponse.fail('Lỗi khi rút đơn', 500);
    }
};
