export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const body = await request.json().catch(() => ({}));
        const notificationId = Number.parseInt(
            String(body.notification_id ?? ''),
            10
        );

        if (!Number.isFinite(notificationId)) {
            return httpResponse.fail('Thiếu ID thông báo', 400);
        }

        // Phải dùng client có phiên đăng nhập: client ẩn danh bị RLS chặn ghi,
        // PostgREST trả về 0 dòng và KHÔNG báo lỗi, nên endpoint vẫn trả
        // success trong khi thông báo không hề được đánh dấu đã đọc.
        const authenticatedSupabase = createAuthenticatedClient(session);

        const { data, error } = await authenticatedSupabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', session.user.id)
            .select('id');

        if (error) {
            console.error('Error updating notification:', error);
            return httpResponse.fail(
                'Lỗi khi cập nhật thông báo: ' + error.message,
                500
            );
        }

        // Không có dòng nào khớp: thông báo không tồn tại hoặc của người khác
        if (!data || data.length === 0) {
            return httpResponse.fail('Không tìm thấy thông báo', 404);
        }

        return httpResponse.ok(
            { message: 'Đã đánh dấu đã đọc' },
            'Đã đánh dấu thông báo là đã đọc',
            200
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        return httpResponse.fail('Lỗi server', 500);
    }
};
