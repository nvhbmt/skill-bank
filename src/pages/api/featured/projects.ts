export const prerender = false;

import type { APIRoute } from 'astro';
import { getFeaturedProjects } from '@/services/projects';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async () => {
    try {
        const projects = await getFeaturedProjects();
        return httpResponse.ok(projects, 'Success', 200);
    } catch (error) {
        console.error('Error fetching featured projects:', error);
        return httpResponse.fail(
            'Lỗi khi tải dự án nổi bật',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};

