import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

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
    joined: ProjectWithMembers[];
    completed: ProjectWithMembers[];
};

// Helper function to calculate progress based on milestones
async function calculateProgress(projectId: number): Promise<number> {
    const { data: milestones } = await supabase
        .from('project_milestones')
        .select('id')
        .eq('project_id', projectId);

    if (!milestones || milestones.length === 0) return 0;

    // Simple progress: assume 20% per milestone, max 100%
    return Math.min(milestones.length * 20, 100);
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
            if (project.status === 'pending' || !project.status) {
                pendingProjects.push(projectWithMembers);
            } else if (project.status === 'approved') {
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

    // 2. Fetch projects where user is member but NOT owner
    // joinedProjects will contain projects the user joined but doesn't own
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
            .neq('owner_id', userId) // Exclude projects where user is owner - only get projects user joined
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

                // Add to joinedProjects - these are projects user joined but doesn't own
                joinedProjects.push(projectWithMembers);
            }
        }
    }

    return {
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
