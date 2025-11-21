export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const body = await request.json();
        const { notification_id } = body;

        if (!notification_id) {
            return httpResponse.fail('Notification ID is required', 400);
        }

        // Update notification as read
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification_id)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error updating notification:', error);
            return httpResponse.fail(
                'Lỗi khi cập nhật thông báo: ' + error.message,
                500
            );
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

