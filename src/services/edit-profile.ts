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
    reviews: Array<
        Pick<Tables<'reviews'>, 'id' | 'rating' | 'comment' | 'created_at'> & {
            reviewer: Pick<
                Tables<'user_info'>,
                'full_name' | 'username' | 'avatar_url'
            > | null;
        }
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
        console.log(profileData);
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

        // Đánh giá người khác dành cho mình (trước đây trang này hiển thị
        // danh sách đánh giá hardcode)
        let reviews: EditProfileData['reviews'] = [];
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select('id, rating, comment, created_at, reviewer_id')
            .eq('reviewee_id', userInfo.user_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(10);

        if (reviewsData && reviewsData.length > 0) {
            const reviewerIds = [
                ...new Set(reviewsData.map((r) => r.reviewer_id)),
            ];
            const { data: reviewers } = await supabase
                .from('user_info')
                .select('user_id, full_name, username, avatar_url')
                .in('user_id', reviewerIds)
                .is('deleted_at', null);

            const reviewerMap = new Map(
                (reviewers || []).map((r) => [r.user_id, r])
            );

            reviews = reviewsData.map((review) => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
                reviewer: reviewerMap.get(review.reviewer_id) ?? null,
            }));
        }

        return {
            userInfo,
            userProfile,
            userSkills,
            allSkills,
            userProjects,
            reviews,
        };
    } catch (error) {
        console.error('Error loading edit profile:', error);
        return null;
    }
}
