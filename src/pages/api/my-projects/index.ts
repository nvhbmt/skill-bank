export const prerender = false;

import type { APIRoute } from 'astro';
import { getMyProjects } from '@/services/projects';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const projects = await getMyProjects(session.user.id);
        return httpResponse.ok(projects, 'Success', 200);
    } catch (error) {
        console.error('Error fetching my projects:', error);
        return httpResponse.fail(
            'Lỗi khi tải dự án',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};
