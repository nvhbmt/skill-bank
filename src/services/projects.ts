import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';
import { sanitizeSearchQuery } from '@/utils/sanitizeSearchQuery';

export type ProjectWithOwner = Pick<
    Tables<'projects'>,
    | 'id'
    | 'title'
    | 'description'
    | 'cover_image_url'
    | 'project_type'
    | 'location'
    | 'start_date'
    | 'status'
    | 'created_at'
    | 'owner_id'
> & {
    user_info: Pick<
        Tables<'user_info'>,
        'user_id' | 'email' | 'full_name' | 'username' | 'avatar_url'
    > | null;
};

export type ProjectWithMembers = {
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

export type MyProjectsResult = {
    pending: ProjectWithMembers[];
    approved: ProjectWithMembers[];
    /** Bị admin từ chối — chủ dự án sửa lại rồi nộp lại được */
    rejected: ProjectWithMembers[];
    joined: ProjectWithMembers[];
    completed: ProjectWithMembers[];
};

// Tiến độ = số mốc đã hoàn thành / tổng số mốc.
// Trước đây công thức là `min(số_mốc * 20, 100)`, tức là đếm số mốc TỒN TẠI
// chứ không phải số mốc ĐÃ XONG — dự án vừa tạo với 5 mốc hiện ngay 100%.
async function calculateProgressBatch(
    projectIds: number[]
): Promise<Map<number, number>> {
    if (projectIds.length === 0) return new Map();

    const { data: milestones } = await supabase
        .from('project_milestones')
        .select('project_id, completed_at')
        .in('project_id', projectIds);

    const progressMap = new Map<number, number>();
    const total = new Map<number, number>();
    const done = new Map<number, number>();

    (milestones || []).forEach((m) => {
        total.set(m.project_id, (total.get(m.project_id) || 0) + 1);
        if (m.completed_at) {
            done.set(m.project_id, (done.get(m.project_id) || 0) + 1);
        }
    });

    projectIds.forEach((id) => {
        const totalCount = total.get(id) || 0;
        if (totalCount === 0) {
            progressMap.set(id, 0);
            return;
        }
        const doneCount = done.get(id) || 0;
        progressMap.set(id, Math.round((doneCount / totalCount) * 100));
    });

    return progressMap;
}

/**
 * Get user's projects (owned and joined) categorized by status
 * @param userId - The user ID
 * @returns Categorized projects with members and progress
 */
export async function getMyProjects(userId: string): Promise<MyProjectsResult> {
    // Initialize project arrays
    const pendingProjects: ProjectWithMembers[] = [];
    const approvedProjects: ProjectWithMembers[] = [];
    const rejectedProjects: ProjectWithMembers[] = [];
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
    }

    // 2. Fetch projects where user is member but NOT owner
    const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .is('left_at', null);

    if (memberError) {
        console.error('Error fetching member projects:', memberError);
    }

    let joinedProjectsData: typeof ownedProjects = [];
    if (memberProjects && memberProjects.length > 0) {
        const projectIds = memberProjects.map((m) => m.project_id);
        const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title, status, created_at, owner_id')
            .in('id', projectIds)
            .neq('owner_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (projectsError) {
            console.error('Error fetching joined projects:', projectsError);
        } else if (projectsData) {
            joinedProjectsData = projectsData;
        }
    }

    // Combine all project IDs for batch queries
    const allProjectIds: number[] = [];
    if (ownedProjects) {
        allProjectIds.push(...ownedProjects.map((p) => p.id));
    }
    if (joinedProjectsData) {
        allProjectIds.push(...joinedProjectsData.map((p) => p.id));
    }

    if (allProjectIds.length === 0) {
        return {
            pending: [],
            approved: [],
            rejected: [],
            joined: [],
            completed: [],
        };
    }

    // Batch fetch all members for all projects at once
    const { data: allMembersData } = await supabase
        .from('project_members')
        .select('project_id, user_id')
        .in('project_id', allProjectIds)
        .is('deleted_at', null)
        .is('left_at', null);

    // Get unique member IDs and batch fetch user info
    const memberIdsSet = new Set<string>();
    const membersByProject = new Map<number, string[]>();

    if (allMembersData) {
        allMembersData.forEach((m) => {
            if (!membersByProject.has(m.project_id)) {
                membersByProject.set(m.project_id, []);
            }
            const projectMembers = membersByProject.get(m.project_id)!;
            if (projectMembers.length < 5) {
                projectMembers.push(m.user_id);
                memberIdsSet.add(m.user_id);
            }
        });
    }

    // Batch fetch all user info
    const memberIds = Array.from(memberIdsSet);
    const { data: membersInfo } = await supabase
        .from('user_info')
        .select('user_id, avatar_url')
        .in('user_id', memberIds)
        .is('deleted_at', null);

    const membersInfoMap = new Map(
        (membersInfo || []).map((m) => [m.user_id, m.avatar_url])
    );

    // Batch calculate progress for all projects
    const progressMap = await calculateProgressBatch(allProjectIds);

    // Helper function to get members for a project
    const getProjectMembers = (projectId: number) => {
        const userIds = membersByProject.get(projectId) || [];
        return userIds.map((uid) => ({
            user_id: uid,
            avatar_url: membersInfoMap.get(uid) || null,
        }));
    };

    // Process owned projects
    if (ownedProjects) {
        for (const project of ownedProjects) {
            const members = getProjectMembers(project.id);
            const progress =
                project.status === 'completed'
                    ? 100
                    : (progressMap.get(project.id) ?? 0);

            const projectWithMembers: ProjectWithMembers = {
                ...project,
                members,
                progress,
            };

            // Categorize by status
            if (project.status === 'pending' || !project.status) {
                pendingProjects.push(projectWithMembers);
            } else if (project.status === 'approved') {
                approvedProjects.push(projectWithMembers);
            } else if (project.status === 'completed') {
                completedProjects.push(projectWithMembers);
            } else if (project.status === 'rejected') {
                rejectedProjects.push(projectWithMembers);
            }
        }
    }

    // Process joined projects
    if (joinedProjectsData) {
        for (const project of joinedProjectsData) {
            const members = getProjectMembers(project.id);
            const progress =
                project.status === 'completed'
                    ? 100
                    : (progressMap.get(project.id) ?? 0);

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

    return {
        rejected: rejectedProjects,
        pending: pendingProjects,
        approved: approvedProjects,
        joined: joinedProjects,
        completed: completedProjects,
    };
}

/**
 * Get projects for explore page (approved projects with owner info)
 * @param limit - Maximum number of projects to return (default: 20)
 * @returns Array of projects with owner info
 */
export async function getExploreProjects(
    limit: number = 20
): Promise<ProjectWithOwner[]> {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select(
                `
                id,
                title,
                description,
                cover_image_url,
                project_type,
                location,
                start_date,
                status,
                created_at,
                owner_id
            `
            )
            .is('deleted_at', null)
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error loading projects:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        // Load owner info separately
        const ownerIds = [...new Set(data.map((p) => p.owner_id))];
        const { data: ownersData, error: ownersError } = await supabase
            .from('user_info')
            .select('user_id, email, full_name, username, avatar_url')
            .in('user_id', ownerIds)
            .is('deleted_at', null);

        if (ownersError) {
            console.error('Error loading owners:', ownersError);
            return data.map((project) => ({
                ...project,
                user_info: null,
            }));
        }

        const ownersMap = new Map(
            (ownersData || []).map((owner) => [owner.user_id, owner])
        );

        return data.map((project) => ({
            ...project,
            user_info: ownersMap.get(project.owner_id) || null,
        }));
    } catch (error) {
        console.error('Unexpected error loading projects:', error);
        return [];
    }
}

/**
 * Search projects by query string
 * @param searchQuery - Search query string
 * @param limit - Maximum number of projects to return (default: 20)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of projects with owner info
 */
export async function searchProjects(
    searchQuery: string,
    limit: number = 20,
    offset: number = 0
): Promise<ProjectWithOwner[]> {
    try {
        const safeQuery = sanitizeSearchQuery(searchQuery);

        let query = supabase
            .from('projects')
            .select(
                `
                id,
                title,
                description,
                cover_image_url,
                project_type,
                location,
                start_date,
                status,
                created_at,
                owner_id
            `
            )
            .is('deleted_at', null)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply search filter if provided
        if (safeQuery) {
            query = query.or(
                `title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error searching projects:', error);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        // Load owner info separately
        const ownerIds = [...new Set(data.map((p) => p.owner_id))];
        const { data: ownersData, error: ownersError } = await supabase
            .from('user_info')
            .select('user_id, email, full_name, username, avatar_url')
            .in('user_id', ownerIds)
            .is('deleted_at', null);

        if (ownersError) {
            console.error('Error loading owners:', ownersError);
            return data.map((project) => ({
                ...project,
                user_info: null,
            }));
        }

        const ownersMap = new Map(
            (ownersData || []).map((owner) => [owner.user_id, owner])
        );

        return data.map((project) => ({
            ...project,
            user_info: ownersMap.get(project.owner_id) || null,
        }));
    } catch (error) {
        console.error('Unexpected error searching projects:', error);
        return [];
    }
}

export type FeaturedProject = {
    image: string;
    tag: string;
    title: string;
    description: string;
    author: string;
    likes: number;
    projectId: number;
};

export type ProjectForApplication = {
    project: Pick<Tables<'projects'>, 'id' | 'title' | 'owner_id'> | null;
    hasApplied: boolean;
};

/**
 * Get project info for application submission page
 * @param projectId - The project ID
 * @param userId - The user ID to check if they already applied
 * @returns Project info and whether user has already applied
 */
export async function getProjectForApplication(
    projectId: number,
    userId: string
): Promise<ProjectForApplication | null> {
    try {
        // Fetch project info
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, title, owner_id')
            .eq('id', projectId)
            .is('deleted_at', null)
            .single();

        if (projectError || !projectData) {
            return null;
        }

        // Check if user already applied
        let hasApplied = false;
        const { data: existingApplication, error: applicationError } =
            await supabase
                .from('applications')
                .select('id')
                .eq('project_id', projectId)
                .eq('applicant_id', userId)
                .is('deleted_at', null)
                .maybeSingle();

        if (!applicationError && existingApplication) {
            hasApplied = true;
        }

        return {
            project: projectData,
            hasApplied,
        };
    } catch (error) {
        console.error('Error loading project for application:', error);
        return null;
    }
}

/**
 * Get featured projects (top 3 by number of applications)
 * @returns Array of featured projects formatted for ProjectCard component
 */
export async function getFeaturedProjects(): Promise<FeaturedProject[]> {
    try {
        // Fetch all approved projects
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select(
                'id, title, description, cover_image_url, project_type, owner_id'
            )
            .is('deleted_at', null)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(50); // Get more to calculate applications count

        if (projectsError || !projects || projects.length === 0) {
            console.error('Error loading projects:', projectsError);
            return [];
        }

        // Count applications for each project
        const projectIds = projects.map((p) => p.id);
        const { data: applications, error: applicationsError } = await supabase
            .from('applications')
            .select('project_id')
            .in('project_id', projectIds)
            .is('deleted_at', null);

        if (applicationsError) {
            console.error('Error loading applications:', applicationsError);
        }

        // Count applications per project
        const applicationCounts = new Map<number, number>();
        if (applications) {
            applications.forEach((app) => {
                const count = applicationCounts.get(app.project_id) || 0;
                applicationCounts.set(app.project_id, count + 1);
            });
        }

        // Sort projects by application count (descending), then by created_at
        const projectsWithCounts = projects
            .map((project) => ({
                project,
                applicationCount: applicationCounts.get(project.id) || 0,
            }))
            .sort((a, b) => {
                if (b.applicationCount !== a.applicationCount) {
                    return b.applicationCount - a.applicationCount;
                }
                // If same count, prefer newer projects
                return 0;
            })
            .slice(0, 3); // Get top 3

        // Fetch owner info
        const ownerIds = [
            ...new Set(projectsWithCounts.map((p) => p.project.owner_id)),
        ];
        const { data: ownersData, error: ownersError } = await supabase
            .from('user_info')
            .select('user_id, full_name, username')
            .in('user_id', ownerIds)
            .is('deleted_at', null);

        if (ownersError) {
            console.error('Error loading owners:', ownersError);
        }

        const ownersMap = new Map(
            (ownersData || []).map((owner) => [owner.user_id, owner])
        );

        // Format project type labels
        const formatProjectType = (type: string | null): string => {
            if (!type) return '';
            const typeMap: Record<string, string> = {
                website: 'Web App',
                'mobile-app': 'Mobile',
                'desktop-app': 'Desktop App',
                'ai-ml': 'AI/ML',
            };
            return typeMap[type] || type;
        };

        // Format data for ProjectCard component
        return projectsWithCounts.map(({ project, applicationCount }) => {
            const owner = ownersMap.get(project.owner_id);
            const author = owner?.full_name || owner?.username || 'Unknown';

            return {
                image:
                    project.cover_image_url ||
                    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
                tag: formatProjectType(project.project_type),
                title: project.title || '',
                description: project.description || '',
                author,
                likes: applicationCount,
                projectId: project.id,
            };
        });
    } catch (error) {
        console.error('Unexpected error loading featured projects:', error);
        return [];
    }
}
