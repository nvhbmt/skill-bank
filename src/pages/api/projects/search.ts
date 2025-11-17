export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const GET: APIRoute = async ({ url }) => {
    try {
        const searchQuery = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Build query
        let query = supabase
            .from('projects')
            .select(
                'id, title, description, cover_image_url, project_type, location, start_date, status, created_at, owner_id'
            )
            .is('deleted_at', null)
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply search filter if provided
        if (searchQuery.trim()) {
            query = query.or(
                `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
            );
        }

        const { data: projects, error } = await query;

        if (error) {
            return httpResponse.fail(
                'Lỗi khi tìm kiếm dự án: ' + error.message,
                500
            );
        }

        // Load owner info separately
        let projectsWithOwners = projects || [];
        if (projects && projects.length > 0) {
            const ownerIds = [...new Set(projects.map((p) => p.owner_id))];
            const { data: ownersData } = await supabase
                .from('user_info')
                .select('user_id, email, full_name, username, avatar_url')
                .in('user_id', ownerIds);

            const ownersMap = new Map(
                (ownersData || []).map((owner) => [owner.user_id, owner])
            );

            projectsWithOwners = projects.map((project) => ({
                ...project,
                user_info: ownersMap.get(project.owner_id) || null,
            }));
        }

        // Get total count for pagination
        let countQuery = supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('status', 'open');

        if (searchQuery.trim()) {
            countQuery = countQuery.or(
                `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
            );
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
            console.error('Error getting count:', countError);
        }

        return httpResponse.ok(
            {
                projects: projectsWithOwners,
                total: count || 0,
                limit,
                offset,
            },
            'Tìm kiếm thành công',
            200
        );
    } catch (error) {
        console.error('Error searching projects:', error);
        return httpResponse.fail(
            'Lỗi khi tìm kiếm dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
