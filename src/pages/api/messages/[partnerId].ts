export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { getThread, markThreadRead } from '@/services/messages';
import httpResponse from '@/utils/response';

/** Toàn bộ tin nhắn giữa người đang đăng nhập và một người khác */
export const GET: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const partnerId = String(params.partnerId ?? '').trim();
        if (!partnerId) {
            return httpResponse.fail('Thiếu người đối thoại', 400);
        }

        const messages = await getThread(session.user.id, partnerId);
        return httpResponse.ok({ messages }, 'Success', 200);
    } catch (error) {
        console.error('Error loading thread:', error);
        return httpResponse.fail('Lỗi khi tải tin nhắn', 500);
    }
};

/** Đánh dấu đã đọc toàn bộ tin nhắn người kia gửi cho mình */
export const POST: APIRoute = async ({ params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const partnerId = String(params.partnerId ?? '').trim();
        if (!partnerId) {
            return httpResponse.fail('Thiếu người đối thoại', 400);
        }

        const supabase = createAuthenticatedClient(session);
        const updated = await markThreadRead(
            supabase,
            session.user.id,
            partnerId
        );

        return httpResponse.ok({ updated }, 'Đã đánh dấu đã đọc', 200);
    } catch (error) {
        console.error('Error marking thread read:', error);
        return httpResponse.fail('Lỗi khi cập nhật tin nhắn', 500);
    }
};
