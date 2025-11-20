export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { getAllUsers, updateUser } from '@/services/admin';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        // Check if user is admin
        const authenticatedSupabase = createAuthenticatedClient(session);
        const { data: userInfo } = await authenticatedSupabase
            .from('user_info')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

        if (userInfo?.role !== 'admin') {
            return httpResponse.fail('Bạn không có quyền truy cập', 403);
        }

        const users = await getAllUsers();

        return httpResponse.ok(users, 'Lấy danh sách người dùng thành công', 200);
    } catch (error) {
        console.error('Error fetching users:', error);
        return httpResponse.fail(
            'Lỗi khi lấy danh sách người dùng: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        // Check if user is admin
        const authenticatedSupabase = createAuthenticatedClient(session);
        const { data: userInfo } = await authenticatedSupabase
            .from('user_info')
            .select('role')
            .eq('user_id', session.user.id)
            .single();

        if (userInfo?.role !== 'admin') {
            return httpResponse.fail('Bạn không có quyền truy cập', 403);
        }

        const body = await request.json();
        const { userId, updates } = body;

        if (!userId || !updates) {
            return httpResponse.fail('Thiếu thông tin', 400);
        }

        const success = await updateUser(userId, updates);

        if (!success) {
            return httpResponse.fail('Cập nhật người dùng thất bại', 500);
        }

        return httpResponse.ok(null, 'Cập nhật người dùng thành công', 200);
    } catch (error) {
        console.error('Error updating user:', error);
        return httpResponse.fail(
            'Lỗi khi cập nhật người dùng: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

