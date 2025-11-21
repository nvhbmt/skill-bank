import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type UserProfileData = {
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
            level: string | null;
        }
    >;
    userProjects: Array<
        Pick<
            Tables<'projects'>,
            'id' | 'title' | 'cover_image_url' | 'project_type' | 'status'
        >
    >;
    reviews: Array<
        Pick<
            Tables<'reviews'>,
            'id' | 'rating' | 'comment' | 'reviewer_id' | 'created_at'
        > & {
            reviewer_info: Pick<
                Tables<'user_info'>,
                'full_name' | 'username' | 'avatar_url'
            > | null;
        }
    >;
    isOwner: boolean;
};

/**
 * Get user profile data by username
 */
export async function getUserProfileByUsername(
    username: string,
    currentUserId?: string
): Promise<UserProfileData | null> {
    try {
        // Fetch user_info
        const { data: userData, error: userError } = await supabase
            .from('user_info')
            .select('*')
            .eq('username', username)
            .is('deleted_at', null)
            .single();

        if (userError || !userData) {
            return null;
        }

        const userInfo = userData;

        // Check if current user is owner
        const isOwner = currentUserId
            ? currentUserId === userInfo.user_id
            : false;

        // Fetch user_profiles
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select(
                'phone, bio, address, portfolio_url, interests, experiences, projects, certifications'
            )
            .eq('user_id', userInfo.user_id)
            .is('deleted_at', null)
            .maybeSingle();

        const userProfile = !profileError && profileData ? profileData : null;

        // Fetch user_skills
        let userSkills: Array<
            Pick<Tables<'skills'>, 'id' | 'name' | 'category'> & {
                level: string | null;
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
                const skillsMap = new Map(
                    userSkillsData.map((us) => [us.skill_id, us.level])
                );
                userSkills = skillsData.map((skill) => ({
                    ...skill,
                    level: skillsMap.get(skill.id) || null,
                }));
            }
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
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!projectsError && projectsData) {
            userProjects = projectsData;
        }

        // Fetch reviews for this user
        let reviews: Array<
            Pick<
                Tables<'reviews'>,
                'id' | 'rating' | 'comment' | 'reviewer_id' | 'created_at'
            > & {
                reviewer_info: Pick<
                    Tables<'user_info'>,
                    'full_name' | 'username' | 'avatar_url'
                > | null;
            }
        > = [];

        const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('id, rating, comment, reviewer_id, created_at')
            .eq('reviewee_id', userInfo.user_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!reviewsError && reviewsData && reviewsData.length > 0) {
            const reviewerIds = reviewsData.map((r) => r.reviewer_id);
            const { data: reviewersData, error: reviewersError } =
                await supabase
                    .from('user_info')
                    .select('user_id, full_name, username, avatar_url')
                    .in('user_id', reviewerIds)
                    .is('deleted_at', null);

            if (!reviewersError && reviewersData) {
                const reviewersMap = new Map(
                    reviewersData.map((r) => [r.user_id, r])
                );
                reviews = reviewsData.map((review) => ({
                    ...review,
                    reviewer_info: reviewersMap.get(review.reviewer_id) || null,
                }));
            }
        }

        return {
            userInfo,
            userProfile,
            userSkills,
            userProjects,
            reviews,
            isOwner,
        };
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

export type FeaturedProfile = {
    name: string;
    role: string;
    avatar: string;
    skills: string[];
    rating: number;
    username: string;
};

/**
 * Get featured profiles (top 4 by average rating)
 * @returns Array of featured profiles formatted for homepage
 */
export async function getFeaturedProfiles(): Promise<FeaturedProfile[]> {
    try {
        // Fetch all users (limit to reasonable number for calculation)
        const { data: users, error: usersError } = await supabase
            .from('user_info')
            .select('user_id, full_name, username, avatar_url')
            .is('deleted_at', null)
            .limit(100);

        if (usersError || !users || users.length === 0) {
            console.error('Error loading users:', usersError);
            return [];
        }

        const userIds = users.map((u) => u.user_id);

        // Fetch all reviews to calculate average ratings
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', userIds)
            .is('deleted_at', null);

        if (reviewsError) {
            console.error('Error loading reviews:', reviewsError);
        }

        // Calculate average rating per user
        const ratingMap = new Map<string, { sum: number; count: number }>();
        if (reviews) {
            reviews.forEach((review) => {
                if (review.rating === null) return; // Skip reviews without rating
                const current = ratingMap.get(review.reviewee_id) || {
                    sum: 0,
                    count: 0,
                };
                ratingMap.set(review.reviewee_id, {
                    sum: current.sum + review.rating,
                    count: current.count + 1,
                });
            });
        }

        // Calculate average ratings
        let usersWithRatings = users
            .map((user) => {
                const ratingData = ratingMap.get(user.user_id);
                const avgRating =
                    ratingData && ratingData.count > 0
                        ? ratingData.sum / ratingData.count
                        : 0;
                return {
                    user,
                    avgRating,
                    reviewCount: ratingData?.count || 0,
                };
            })
            .filter((u) => u.reviewCount > 0) // Only users with reviews
            .sort((a, b) => {
                // Sort by average rating (descending), then by review count
                if (b.avgRating !== a.avgRating) {
                    return b.avgRating - a.avgRating;
                }
                return b.reviewCount - a.reviewCount;
            })
            .slice(0, 4); // Get top 4

        // If no users with reviews, get first 3 users
        if (usersWithRatings.length === 0) {
            usersWithRatings = users.slice(0, 3).map((user) => ({
                user,
                avgRating: 0,
                reviewCount: 0,
            }));
        }

        // Fetch skills for these users
        const featuredUserIds = usersWithRatings.map((u) => u.user.user_id);
        const { data: userSkillsData, error: skillsError } = await supabase
            .from('user_skills')
            .select('user_id, skill_id')
            .in('user_id', featuredUserIds)
            .is('deleted_at', null);

        if (skillsError) {
            console.error('Error loading user skills:', skillsError);
        }

        // Get skill names
        const skillIds = [
            ...new Set(
                (userSkillsData || []).map((us) => us.skill_id).filter(Boolean)
            ),
        ];
        const { data: skillsData, error: skillsDataError } = await supabase
            .from('skills')
            .select('id, name')
            .in('id', skillIds);

        if (skillsDataError) {
            console.error('Error loading skills:', skillsDataError);
        }

        const skillsMap = new Map(
            (skillsData || []).map((s) => [s.id, s.name])
        );

        // Group skills by user
        const userSkillsMap = new Map<string, string[]>();
        if (userSkillsData) {
            userSkillsData.forEach((us) => {
                const skillName = skillsMap.get(us.skill_id);
                if (skillName) {
                    const current = userSkillsMap.get(us.user_id) || [];
                    userSkillsMap.set(us.user_id, [...current, skillName]);
                }
            });
        }

        // Format data for homepage
        return usersWithRatings.map(({ user, avgRating }) => {
            const skills = userSkillsMap.get(user.user_id) || [];
            // Determine role based on top skill category or default
            const role =
                skills.length > 0 ? `${skills[0]} Developer` : 'Developer';

            return {
                name: user.full_name || user.username || 'Unknown',
                role,
                avatar:
                    user.avatar_url || '/assets/images/avatar-default-icon.png',
                skills: skills.slice(0, 2), // Limit to 2 skills for display
                rating: avgRating > 0 ? Math.round(avgRating) : 0, // Round to nearest integer, or 0 if no reviews
                username: user.username,
            };
        });
    } catch (error) {
        console.error('Unexpected error loading featured profiles:', error);
        return [];
    }
}
