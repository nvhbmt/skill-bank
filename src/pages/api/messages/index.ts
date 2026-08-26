export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import {
    getConversations,
    getUnreadCount,
    sendMessage,
} from '@/services/messages';
import httpResponse from '@/utils/response';

/** Danh sách hội thoại + tổng số tin chưa đọc */
export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const [conversations, unread] = await Promise.all([
            getConversations(session.user.id),
            getUnreadCount(session.user.id),
        ]);

        return httpResponse.ok({ conversations, unread }, 'Success', 200);
    } catch (error) {
        console.error('Error loading conversations:', error);
        return httpResponse.fail('Lỗi khi tải hội thoại', 500);
    }
};

/** Gửi tin nhắn tới một người dùng */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const body = await request.json().catch(() => ({}));
        const receiverId = String(body.receiver_id ?? '').trim();
        const content =
            typeof body.content === 'string' ? body.content.trim() : '';

        if (!receiverId) {
            return httpResponse.fail('Thiếu người nhận', 400);
        }
        if (receiverId === session.user.id) {
            return httpResponse.fail('Không thể tự nhắn cho mình', 400);
        }
        if (!content) {
            return httpResponse.fail('Nội dung tin nhắn trống', 400);
        }
        if (content.length > 2000) {
            return httpResponse.fail(
                'Tin nhắn không được vượt quá 2000 ký tự',
                400
            );
        }

        const supabase = createAuthenticatedClient(session);

        // Người nhận phải tồn tại và chưa bị xoá
        const { data: receiver } = await supabase
            .from('user_info')
            .select('user_id')
            .eq('user_id', receiverId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!receiver) {
            return httpResponse.fail('Không tìm thấy người nhận', 404);
        }

        const result = await sendMessage(
            supabase,
            session.user.id,
            receiverId,
            content
        );

        if (!result.ok) {
            return httpResponse.fail(
                'Lỗi khi gửi tin nhắn: ' + (result.error ?? ''),
                500
            );
        }

        return httpResponse.ok(result.message, 'Đã gửi', 200);
    } catch (error) {
        console.error('Error sending message:', error);
        return httpResponse.fail('Lỗi khi gửi tin nhắn', 500);
    }
};
