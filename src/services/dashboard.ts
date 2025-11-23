import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type DashboardStats = {
    reputation: number;
    likes: number;
    views: number;
    invites: number;
};

export type RecommendedProject = {
    id: number;
    title: string;
    desc: string;
    image: string;
    tags: string[];
    author: string;
    deadline: string;
    match: number;
};

export type Activity = {
    type: 'applied' | 'posted' | 'joined';
    project: string;
    time: string;
};

export type TrendingSkill = {
    name: string;
    count: string;
};

export type DashboardData = {
    stats: DashboardStats;
    recommendedProjects: RecommendedProject[];
    activities: Activity[];
    trendingSkills: TrendingSkill[];
    profileStrength: number;
};

/**
 * Calculate time ago string
 */
function getTimeAgo(dateString: string | null): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}w ago`;
        }
    } catch {
        return '';
    }
}

/**
 * Calculate days left until deadline
 */
function getDaysLeft(deadline: string | null): string {
    if (!deadline) return '';
    try {
        const deadlineDate = new Date(deadline);
        const now = new Date();
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);

        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day left';
        if (diffDays < 7) return `${diffDays} days left`;
        const weeks = Math.floor(diffDays / 7);
        if (weeks === 1) return '1 week left';
        if (weeks < 4) return `${weeks} weeks left`;
        const months = Math.floor(diffDays / 30);
        if (months === 1) return '1 month left';
        return `${months} months left`;
    } catch {
        return '';
    }
}

/**
 * Calculate match percentage based on user skills and project skills
 */
async function calculateMatch(
    projectId: number,
    userId: string
): Promise<number> {
    try {
        // Get user skills
        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_id')
            .eq('user_id', userId)
            .is('deleted_at', null);

        if (!userSkills || userSkills.length === 0) return 0;

        // Get project skills
        const { data: projectSkills } = await supabase
            .from('project_skills')
            .select('skill_id')
            .eq('project_id', projectId);

        if (!projectSkills || projectSkills.length === 0) return 0;

        const userSkillIds = new Set(userSkills.map((us) => us.skill_id));
        const projectSkillIds = new Set(projectSkills.map((ps) => ps.skill_id));

        // Count matching skills
        let matches = 0;
        projectSkillIds.forEach((skillId) => {
            if (userSkillIds.has(skillId)) matches++;
        });

        // Calculate percentage
        return Math.round((matches / projectSkillIds.size) * 100);
    } catch {
        return 0;
    }
}

/**
 * Get dashboard stats for a user
 */
async function getUserStats(userId: string): Promise<DashboardStats> {
    try {
        // Reputation: average rating from reviews
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('reviewee_id', userId)
            .not('rating', 'is', null);

        let reputation = 0;
        if (reviews && reviews.length > 0) {
            const avgRating =
                reviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
                reviews.length;
            reputation = Math.round(avgRating * 100); // Convert to 0-1000 scale
        }

        // Likes: number of applications received for user's projects
        const { data: userProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('owner_id', userId)
            .is('deleted_at', null);

        let likes = 0;
        if (userProjects && userProjects.length > 0) {
            const projectIds = userProjects.map((p) => p.id);
            const { count } = await supabase
                .from('applications')
                .select('id', { count: 'exact', head: true })
                .in('project_id', projectIds)
                .is('deleted_at', null);
            likes = count || 0;
        }

        // Views: placeholder (can be enhanced with view tracking)
        const views = 0;

        // Invites: unread messages/notifications
        const { count: invitesCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        const invites = invitesCount || 0;

        return {
            reputation,
            likes,
            views,
            invites,
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return {
            reputation: 0,
            likes: 0,
            views: 0,
            invites: 0,
        };
    }
}

/**
 * Get recommended projects for a user based on their skills
 */
async function getRecommendedProjects(
    userId: string,
    limit: number = 3
): Promise<RecommendedProject[]> {
    try {
        // Get user skills
        const { data: userSkills } = await supabase
            .from('user_skills')
            .select('skill_id')
            .eq('user_id', userId)
            .is('deleted_at', null);

        let projectsQuery = supabase
            .from('projects')
            .select(
                'id, title, description, cover_image_url, start_date, owner_id'
            )
            .is('deleted_at', null)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(limit * 3); // Get more to filter and match

        const { data: projects, error } = await projectsQuery;

        if (error || !projects || projects.length === 0) {
            return [];
        }

        // Get project skills for all projects
        const projectIds = projects.map((p) => p.id);
        const { data: projectSkills } = await supabase
            .from('project_skills')
            .select('project_id, skill_id')
            .in('project_id', projectIds);

        // Get skills info
        const skillIds = new Set<number>();
        if (projectSkills) {
            projectSkills.forEach((ps) => skillIds.add(ps.skill_id));
        }
        const { data: skillsData } = await supabase
            .from('skills')
            .select('id, name')
            .in('id', Array.from(skillIds));

        const skillsMap = new Map(
            (skillsData || []).map((s) => [s.id, s.name])
        );

        // Get owners info
        const ownerIds = [...new Set(projects.map((p) => p.owner_id))];
        const { data: ownersData } = await supabase
            .from('user_info')
            .select('user_id, full_name, username')
            .in('user_id', ownerIds)
            .is('deleted_at', null);

        const ownersMap = new Map(
            (ownersData || []).map((o) => [
                o.user_id,
                o.full_name || o.username || 'Unknown',
            ])
        );

        // Calculate match scores and format projects
        const projectsWithMatch = await Promise.all(
            projects.map(async (project) => {
                const match = await calculateMatch(project.id, userId);

                // Get project skills
                const projSkills = (projectSkills || [])
                    .filter((ps) => ps.project_id === project.id)
                    .map((ps) => skillsMap.get(ps.skill_id) || '')
                    .filter((s) => s !== '');

                return {
                    project,
                    match,
                    skills: projSkills,
                };
            })
        );

        // Sort by match score and take top projects
        const recommended = projectsWithMatch
            .sort((a, b) => b.match - a.match)
            .slice(0, limit)
            .map(({ project, match, skills }) => ({
                id: project.id,
                title: project.title || '',
                desc: project.description || '',
                image:
                    project.cover_image_url ||
                    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop',
                tags: skills.slice(0, 2), // Limit to 2 tags
                author: ownersMap.get(project.owner_id) || 'Unknown',
                deadline: getDaysLeft(project.start_date),
                match,
            }));

        return recommended;
    } catch (error) {
        console.error('Error fetching recommended projects:', error);
        return [];
    }
}

/**
 * Get recent activities for a user
 */
async function getRecentActivities(
    userId: string,
    limit: number = 3
): Promise<Activity[]> {
    try {
        const activities: Activity[] = [];

        // Get recent applications
        const { data: applications } = await supabase
            .from('applications')
            .select('project_id, applied_at')
            .eq('applicant_id', userId)
            .is('deleted_at', null)
            .order('applied_at', { ascending: false })
            .limit(limit);

        if (applications && applications.length > 0) {
            const projectIds = applications.map((a) => a.project_id);
            const { data: projects } = await supabase
                .from('projects')
                .select('id, title')
                .in('id', projectIds)
                .is('deleted_at', null);

            const projectsMap = new Map(
                (projects || []).map((p) => [p.id, p.title || ''])
            );

            applications.forEach((app) => {
                activities.push({
                    type: 'applied',
                    project:
                        projectsMap.get(app.project_id) || 'Unknown Project',
                    time: getTimeAgo(app.applied_at),
                });
            });
        }

        // Get recent projects posted
        const { data: postedProjects } = await supabase
            .from('projects')
            .select('id, title, created_at')
            .eq('owner_id', userId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (postedProjects) {
            postedProjects.forEach((project) => {
                activities.push({
                    type: 'posted',
                    project: project.title || 'Unknown Project',
                    time: getTimeAgo(project.created_at),
                });
            });
        }

        // Get recent joined projects
        const { data: joinedMembers } = await supabase
            .from('project_members')
            .select('project_id, joined_at')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .is('left_at', null)
            .order('joined_at', { ascending: false })
            .limit(limit);

        if (joinedMembers && joinedMembers.length > 0) {
            const projectIds = joinedMembers.map((m) => m.project_id);
            const { data: projects } = await supabase
                .from('projects')
                .select('id, title')
                .in('id', projectIds)
                .is('deleted_at', null);

            const projectsMap = new Map(
                (projects || []).map((p) => [p.id, p.title || ''])
            );

            joinedMembers.forEach((member) => {
                activities.push({
                    type: 'joined',
                    project:
                        projectsMap.get(member.project_id) || 'Unknown Project',
                    time: getTimeAgo(member.joined_at),
                });
            });
        }

        // Sort by time and take most recent
        return activities
            .sort((a, b) => {
                // Simple sort by time string (this is approximate)
                return 0; // Keep original order
            })
            .slice(0, limit);
    } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
    }
}

/**
 * Get trending skills based on recent projects
 */
async function getTrendingSkills(limit: number = 5): Promise<TrendingSkill[]> {
    try {
        // Get skills from recent projects (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentProjects } = await supabase
            .from('projects')
            .select('id')
            .is('deleted_at', null)
            .eq('status', 'approved')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .limit(100);

        if (!recentProjects || recentProjects.length === 0) {
            return [];
        }

        const projectIds = recentProjects.map((p) => p.id);
        const { data: projectSkills } = await supabase
            .from('project_skills')
            .select('skill_id')
            .in('project_id', projectIds);

        if (!projectSkills || projectSkills.length === 0) {
            return [];
        }

        // Count skill occurrences
        const skillCounts = new Map<number, number>();
        projectSkills.forEach((ps) => {
            const count = skillCounts.get(ps.skill_id) || 0;
            skillCounts.set(ps.skill_id, count + 1);
        });

        // Get previous period for comparison (30-60 days ago)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: previousProjects } = await supabase
            .from('projects')
            .select('id')
            .is('deleted_at', null)
            .eq('status', 'approved')
            .gte('created_at', sixtyDaysAgo.toISOString())
            .lt('created_at', thirtyDaysAgo.toISOString())
            .limit(100);

        const previousProjectIds = (previousProjects || []).map((p) => p.id);
        const { data: previousProjectSkills } = await supabase
            .from('project_skills')
            .select('skill_id')
            .in('project_id', previousProjectIds);

        const previousSkillCounts = new Map<number, number>();
        if (previousProjectSkills) {
            previousProjectSkills.forEach((ps) => {
                const count = previousSkillCounts.get(ps.skill_id) || 0;
                previousSkillCounts.set(ps.skill_id, count + 1);
            });
        }

        // Get skill names
        const skillIds = Array.from(skillCounts.keys());
        const { data: skillsData } = await supabase
            .from('skills')
            .select('id, name')
            .in('id', skillIds);

        if (!skillsData) {
            return [];
        }

        // Calculate percentage change and format
        const trending = skillsData
            .map((skill) => {
                const currentCount = skillCounts.get(skill.id) || 0;
                const previousCount = previousSkillCounts.get(skill.id) || 0;

                let change = 0;
                if (previousCount > 0) {
                    change = Math.round(
                        ((currentCount - previousCount) / previousCount) * 100
                    );
                } else if (currentCount > 0) {
                    change = 100; // New skill
                }

                return {
                    id: skill.id,
                    name: skill.name,
                    change,
                };
            })
            .filter((s) => s.change > 0) // Only show positive trends
            .sort((a, b) => b.change - a.change)
            .slice(0, limit)
            .map((s) => ({
                name: s.name,
                count: `+${s.change}%`,
            }));

        return trending;
    } catch (error) {
        console.error('Error fetching trending skills:', error);
        return [];
    }
}

/**
 * Calculate profile strength percentage
 */
async function calculateProfileStrength(userId: string): Promise<number> {
    try {
        let score = 0;
        const maxScore = 100;

        // Check user_info completeness (20 points)
        const { data: userInfo } = await supabase
            .from('user_info')
            .select('full_name, username, avatar_url')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .single();

        if (userInfo) {
            if (userInfo.full_name) score += 10;
            if (userInfo.username) score += 5;
            if (userInfo.avatar_url) score += 5;
        }

        // Check user_profiles completeness (30 points)
        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('bio, portfolio_url, experiences, certifications')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .maybeSingle();

        if (userProfile) {
            if (userProfile.bio) score += 10;
            if (userProfile.portfolio_url) score += 5;
            if (userProfile.experiences) score += 10;
            if (userProfile.certifications) score += 5;
        }

        // Check user_skills (30 points)
        const { count: skillsCount } = await supabase
            .from('user_skills')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('deleted_at', null);

        if (skillsCount) {
            score += Math.min(skillsCount * 3, 30); // 3 points per skill, max 30
        }

        // Check projects (20 points)
        const { count: projectsCount } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', userId)
            .is('deleted_at', null);

        if (projectsCount) {
            score += Math.min(projectsCount * 5, 20); // 5 points per project, max 20
        }

        return Math.min(score, maxScore);
    } catch (error) {
        console.error('Error calculating profile strength:', error);
        return 0;
    }
}

/**
 * Get all dashboard data for a user
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
    try {
        const [
            stats,
            recommendedProjects,
            activities,
            trendingSkills,
            profileStrength,
        ] = await Promise.all([
            getUserStats(userId),
            getRecommendedProjects(userId, 3),
            getRecentActivities(userId, 3),
            getTrendingSkills(5),
            calculateProfileStrength(userId),
        ]);

        return {
            stats,
            recommendedProjects,
            activities,
            trendingSkills,
            profileStrength,
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
            stats: {
                reputation: 0,
                likes: 0,
                views: 0,
                invites: 0,
            },
            recommendedProjects: [],
            activities: [],
            trendingSkills: [],
            profileStrength: 0,
        };
    }
}
