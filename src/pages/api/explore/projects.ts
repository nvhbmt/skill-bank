export const prerender = false;

import type { APIRoute } from 'astro';
import { getExploreProjects } from '@/services/projects';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ url }) => {
    try {
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const projects = await getExploreProjects(limit);
        return httpResponse.ok(projects, 'Success', 200);
    } catch (error) {
        console.error('Error fetching explore projects:', error);
        return httpResponse.fail(
            'Lỗi khi tải dự án',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};
