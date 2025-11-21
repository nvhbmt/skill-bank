import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type ProjectDetailData = {
    project: Tables<'projects'> | null;
    owner: Pick<
        Tables<'user_info'>,
        'user_id' | 'email' | 'full_name' | 'username' | 'avatar_url'
    > | null;
    projectSkills: Array<Pick<Tables<'skills'>, 'id' | 'name' | 'category'>>;
    members: Array<
        Pick<
            Tables<'user_info'>,
            'user_id' | 'full_name' | 'username' | 'avatar_url'
        > & {
            role: string | null;
        }
    >;
    milestones: Array<
        Pick<
            Tables<'project_milestones'>,
            'id' | 'title' | 'description' | 'order_index'
        >
    >;
    isOwner: boolean;
    isMember: boolean;
};

/**
 * Get project detail data by project ID
 */
export async function getProjectDetailById(
    projectId: number,
    currentUserId?: string
): Promise<ProjectDetailData | null> {
    try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .is('deleted_at', null)
            .single();

        if (projectError || !projectData) {
            return null;
        }

        const project = projectData;

        // Fetch owner info
        let owner: Pick<
            Tables<'user_info'>,
            'user_id' | 'email' | 'full_name' | 'username' | 'avatar_url'
        > | null = null;

        const { data: ownerData, error: ownerError } = await supabase
            .from('user_info')
            .select('user_id, email, full_name, username, avatar_url')
            .eq('user_id', project.owner_id)
            .is('deleted_at', null)
            .single();

        if (!ownerError && ownerData) {
            owner = ownerData;
        }

        // Fetch project skills
        let projectSkills: Array<
            Pick<Tables<'skills'>, 'id' | 'name' | 'category'>
        > = [];

        const { data: projectSkillsData, error: skillsError } = await supabase
            .from('project_skills')
            .select('skill_id')
            .eq('project_id', projectId);

        if (!skillsError && projectSkillsData && projectSkillsData.length > 0) {
            const skillIds = projectSkillsData.map((ps) => ps.skill_id);

            const { data: skillsData, error: skillsDataError } = await supabase
                .from('skills')
                .select('id, name, category')
                .in('id', skillIds);

            if (!skillsDataError && skillsData) {
                projectSkills = skillsData;
            }
        }

        // Fetch project members
        let members: Array<
            Pick<
                Tables<'user_info'>,
                'user_id' | 'full_name' | 'username' | 'avatar_url'
            > & {
                role: string | null;
            }
        > = [];

        const { data: membersData, error: membersError } = await supabase
            .from('project_members')
            .select('user_id, role')
            .eq('project_id', projectId)
            .is('deleted_at', null)
            .is('left_at', null);

        if (!membersError && membersData && membersData.length > 0) {
            const memberIds = membersData.map((m) => m.user_id);
            const { data: membersInfoData, error: membersInfoError } =
                await supabase
                    .from('user_info')
                    .select('user_id, full_name, username, avatar_url')
                    .in('user_id', memberIds)
                    .is('deleted_at', null);

            if (!membersInfoError && membersInfoData) {
                const membersMap = new Map(
                    membersInfoData.map((m) => [m.user_id, m])
                );
                members = membersData
                    .map((m) => {
                        const info = membersMap.get(m.user_id);
                        return info
                            ? {
                                  ...info,
                                  role: m.role,
                              }
                            : null;
                    })
                    .filter(
                        (m): m is NonNullable<typeof m> => m !== null
                    );
            }
        }

        // Fetch project milestones (timeline)
        let milestones: Array<
            Pick<
                Tables<'project_milestones'>,
                'id' | 'title' | 'description' | 'order_index'
            >
        > = [];

        const { data: milestonesData, error: milestonesError } =
            await supabase
                .from('project_milestones')
                .select('id, title, description, order_index')
                .eq('project_id', projectId)
                .order('order_index', { ascending: true });

        if (!milestonesError && milestonesData) {
            milestones = milestonesData;
        }

        // Check user permissions
        const isOwner = currentUserId
            ? currentUserId === project.owner_id
            : false;
        const isMember =
            isOwner ||
            (currentUserId
                ? members.some((member) => member.user_id === currentUserId)
                : false);

        return {
            project,
            owner,
            projectSkills,
            members,
            milestones,
            isOwner,
            isMember,
        };
    } catch (error) {
        console.error('Error loading project:', error);
        return null;
    }
}

