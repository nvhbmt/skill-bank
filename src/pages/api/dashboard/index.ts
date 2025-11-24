export const prerender = false;

import type { APIRoute } from 'astro';
import { getDashboardData } from '@/services/dashboard';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const dashboardData = await getDashboardData(session.user.id);
        return httpResponse.ok(dashboardData, 'Success', 200);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return httpResponse.fail(
            'Lỗi khi tải dữ liệu dashboard',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};
