export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        // Fetch notifications
        const { data: notificationsData, error: notificationsError } =
            await supabase
                .from('notifications')
                .select('id, title, message, type, is_read, created_at')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(10);

        if (notificationsError) {
            console.error('Error fetching notifications:', notificationsError);
            return httpResponse.fail(
                'Lỗi khi tải thông báo: ' + notificationsError.message,
                500
            );
        }

        return httpResponse.ok(
            {
                notifications: notificationsData || [],
                unreadCount:
                    notificationsData?.filter((n) => !n.is_read).length || 0,
            },
            'Lấy danh sách thông báo thành công',
            200
        );
    } catch (error) {
        console.error('Unexpected error:', error);
        return httpResponse.fail('Lỗi server', 500);
    }
};

