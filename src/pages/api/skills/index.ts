export const prerender = false;

import type { APIRoute } from 'astro';
import { getAllSkills } from '@/services/skills';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async () => {
    try {
        const skills = await getAllSkills();
        return httpResponse.ok(skills, 'Success', 200);
    } catch (error) {
        console.error('Error fetching skills:', error);
        return httpResponse.fail(
            'Lỗi khi tải kỹ năng',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};
