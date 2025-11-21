import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type EditProfileData = {
    userInfo: Tables<'user_info'> | null;
    userProfile: Pick<
        Tables<'user_profiles'>,
        | 'phone'
        | 'bio'
        | 'address'
        | 'portfolio_url'
        | 'interests'
        | 'experiences'
        | 'projects'
        | 'certifications'
    > | null;
    userSkills: Array<
        Pick<Tables<'skills'>, 'id' | 'name' | 'category'> & {
            skill_id: number;
        }
    >;
    allSkills: Array<Pick<Tables<'skills'>, 'id' | 'name' | 'category'>>;
    userProjects: Array<
        Pick<
            Tables<'projects'>,
            'id' | 'title' | 'cover_image_url' | 'project_type' | 'status'
        >
    >;
};

/**
 * Get edit profile data for current user
 */
export async function getEditProfileData(
    userId: string
): Promise<EditProfileData | null> {
    try {
        // Fetch user_info
        const { data: userData, error: userError } = await supabase
            .from('user_info')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .single();

        if (userError || !userData) {
            return null;
        }

        const userInfo = userData;

        // Fetch user_profiles
        let userProfile: Pick<
            Tables<'user_profiles'>,
            | 'phone'
            | 'bio'
            | 'address'
            | 'portfolio_url'
            | 'interests'
            | 'experiences'
            | 'projects'
            | 'certifications'
        > | null = null;

        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select(
                'phone, bio, address, portfolio_url, interests, experiences, projects, certifications'
            )
            .eq('user_id', userInfo.user_id)
            .is('deleted_at', null)
            .maybeSingle();

        if (!profileError && profileData) {
            userProfile = profileData;
        }

        // Fetch user_skills
        let userSkills: Array<
            Pick<Tables<'skills'>, 'id' | 'name' | 'category'> & {
                skill_id: number;
            }
        > = [];

        const { data: userSkillsData, error: skillsError } = await supabase
            .from('user_skills')
            .select('skill_id, level')
            .eq('user_id', userInfo.user_id)
            .is('deleted_at', null);

        if (!skillsError && userSkillsData && userSkillsData.length > 0) {
            const skillIds = userSkillsData.map((us) => us.skill_id);
            const { data: skillsData, error: skillsDataError } = await supabase
                .from('skills')
                .select('id, name, category')
                .in('id', skillIds);

            if (!skillsDataError && skillsData) {
                userSkills = skillsData.map((skill) => ({
                    ...skill,
                    skill_id: skill.id,
                }));
            }
        }

        // Fetch all available skills for dropdown
        let allSkills: Array<
            Pick<Tables<'skills'>, 'id' | 'name' | 'category'>
        > = [];

        const { data: allSkillsData, error: allSkillsError } = await supabase
            .from('skills')
            .select('id, name, category')
            .order('name', { ascending: true });

        if (!allSkillsError && allSkillsData) {
            allSkills = allSkillsData;
        }

        // Fetch user projects (as owner)
        let userProjects: Array<
            Pick<
                Tables<'projects'>,
                'id' | 'title' | 'cover_image_url' | 'project_type' | 'status'
            >
        > = [];

        const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('id, title, cover_image_url, project_type, status')
            .eq('owner_id', userInfo.user_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(5);

        if (!projectsError && projectsData) {
            userProjects = projectsData;
        }

        return {
            userInfo,
            userProfile,
            userSkills,
            allSkills,
            userProjects,
        };
    } catch (error) {
        console.error('Error loading edit profile:', error);
        return null;
    }
}

