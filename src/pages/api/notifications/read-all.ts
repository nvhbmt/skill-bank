export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

/** Đánh dấu toàn bộ thông báo chưa đọc của người dùng là đã đọc */
export const POST: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const supabase = createAuthenticatedClient(session);

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session.user.id)
            .eq('is_read', false)
            .select('id');

        if (error) {
            console.error('Error marking all notifications read:', error);
            return httpResponse.fail(
                'Lỗi khi cập nhật thông báo: ' + error.message,
                500
            );
        }

        return httpResponse.ok(
            { updated: data?.length ?? 0 },
            'Đã đánh dấu tất cả là đã đọc',
            200
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        return httpResponse.fail('Lỗi server', 500);
    }
};
