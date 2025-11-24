export const prerender = false;

import type { APIRoute } from 'astro';
import { getFeaturedProfiles } from '@/services/user-profile';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async () => {
    try {
        const profiles = await getFeaturedProfiles();
        return httpResponse.ok(profiles, 'Success', 200);
    } catch (error) {
        console.error('Error fetching featured profiles:', error);
        return httpResponse.fail(
            'Lỗi khi tải profile nổi bật',
            500,
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
};

