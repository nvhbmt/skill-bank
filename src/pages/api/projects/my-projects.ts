export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import httpResponse from '@/utils/response';

type ProjectWithMembers = {
    id: number;
    title: string;
    status: string | null;
    created_at: string | null;
    members: Array<{
        user_id: string;
        avatar_url: string | null;
    }>;
    progress: number;
};

// Helper function to calculate progress based on milestones
async function calculateProgress(
    projectId: number
): Promise<number> {
    const { data: milestones } = await supabase
        .from('project_milestones')
        .select('id')
        .eq('project_id', projectId);

    if (!milestones || milestones.length === 0) return 0;

    // Simple progress: assume 20% per milestone, max 100%
    return Math.min(milestones.length * 20, 100);
}

export const GET: APIRoute = async ({ locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const userId = session.user.id;

        // Initialize project arrays
        const pendingProjects: ProjectWithMembers[] = [];
        const approvedProjects: ProjectWithMembers[] = [];
        const joinedProjects: ProjectWithMembers[] = [];
        const completedProjects: ProjectWithMembers[] = [];

        // 1. Fetch projects where user is owner
        const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('id, title, status, created_at')
            .eq('owner_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (ownedError) {
            console.error('Error fetching owned projects:', ownedError);
        } else if (ownedProjects) {
            // Fetch members for each owned project
            for (const project of ownedProjects) {
                const { data: membersData } = await supabase
                    .from('project_members')
                    .select('user_id')
                    .eq('project_id', project.id)
                    .is('deleted_at', null)
                    .is('left_at', null)
                    .limit(5);

                let members: Array<{
                    user_id: string;
                    avatar_url: string | null;
                }> = [];
                if (membersData && membersData.length > 0) {
                    const memberIds = membersData.map((m) => m.user_id);
                    const { data: membersInfo } = await supabase
                        .from('user_info')
                        .select('user_id, avatar_url')
                        .in('user_id', memberIds)
                        .is('deleted_at', null);

                    if (membersInfo) {
                        members = membersInfo;
                    }
                }

                const progress = await calculateProgress(project.id);

                const projectWithMembers: ProjectWithMembers = {
                    ...project,
                    members,
                    progress,
                };

                // Categorize by status
                if (project.status === 'draft' || !project.status) {
                    pendingProjects.push(projectWithMembers);
                } else if (project.status === 'open') {
                    approvedProjects.push(projectWithMembers);
                } else if (project.status === 'completed') {
                    // Completed projects always have 100% progress
                    completedProjects.push({
                        ...projectWithMembers,
                        progress: 100,
                    });
                }
            }
        }

        // 2. Fetch projects where user is member (not owner)
        const { data: memberProjects, error: memberError } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .is('left_at', null);

        if (memberError) {
            console.error('Error fetching member projects:', memberError);
        } else if (memberProjects && memberProjects.length > 0) {
            const projectIds = memberProjects.map((m) => m.project_id);

            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('id, title, status, created_at, owner_id')
                .in('id', projectIds)
                .neq('owner_id', userId) // Exclude projects where user is owner
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (projectsError) {
                console.error('Error fetching joined projects:', projectsError);
            } else if (projectsData) {
                // Fetch members for each joined project
                for (const project of projectsData) {
                    const { data: membersData } = await supabase
                        .from('project_members')
                        .select('user_id')
                        .eq('project_id', project.id)
                        .is('deleted_at', null)
                        .is('left_at', null)
                        .limit(5);

                    let members: Array<{
                        user_id: string;
                        avatar_url: string | null;
                    }> = [];
                    if (membersData && membersData.length > 0) {
                        const memberIds = membersData.map((m) => m.user_id);
                        const { data: membersInfo } = await supabase
                            .from('user_info')
                            .select('user_id, avatar_url')
                            .in('user_id', memberIds)
                            .is('deleted_at', null);

                        if (membersInfo) {
                            members = membersInfo;
                        }
                    }

                    const progress = await calculateProgress(project.id);

                    const projectWithMembers: ProjectWithMembers = {
                        id: project.id,
                        title: project.title,
                        status: project.status,
                        created_at: project.created_at,
                        members,
                        progress,
                    };

                    joinedProjects.push(projectWithMembers);
                }
            }
        }

        return httpResponse.ok(
            {
                pending: pendingProjects,
                approved: approvedProjects,
                joined: joinedProjects,
                completed: completedProjects,
            },
            'Lấy danh sách dự án thành công',
            200
        );
    } catch (error) {
        console.error('Error loading projects:', error);
        return httpResponse.fail(
            'Lỗi khi lấy danh sách dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

