export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail(
                'Bạn cần đăng nhập để cập nhật profile',
                401
            );
        }

        const authenticatedSupabase = createAuthenticatedClient(session);

        // Fetch current user info to get username for redirect
        const { data: userInfo, error: userInfoError } =
            await authenticatedSupabase
                .from('user_info')
                .select('user_id, username, full_name, avatar_url')
                .eq('user_id', session.user.id)
                .is('deleted_at', null)
                .single();

        if (userInfoError || !userInfo) {
            return httpResponse.fail(
                'Không tìm thấy thông tin người dùng',
                404
            );
        }

        // Fetch current user profile
        const { data: userProfile } = await authenticatedSupabase
            .from('user_profiles')
            .select('phone, bio, address, portfolio_url')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .maybeSingle();

        const formData = await request.formData();
        const fullName = formData.get('full_name') as string | null;
        const phone = formData.get('phone') as string | null;
        const bio = formData.get('bio') as string | null;
        const address = formData.get('address') as string | null;
        const interestsText = formData.get('interests') as string | null;
        const experiencesText = formData.get('experiences') as string | null;
        const projectsText = formData.get('projects') as string | null;
        const certificationsText = formData.get('certifications') as string | null;
        const skillIds = formData.getAll('skill_ids') as string[];
        const avatarFile = formData.get('avatar') as File | null;
        const coverImageFile = formData.get('cover_image') as File | null;

        // Parse textarea inputs to JSON arrays (split by newline, filter empty lines)
        const interests = interestsText
            ? JSON.stringify(
                  interestsText
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
              )
            : null;
        const experiences = experiencesText
            ? JSON.stringify(
                  experiencesText
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
              )
            : null;
        const projects = projectsText
            ? JSON.stringify(
                  projectsText
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
              )
            : null;
        const certifications = certificationsText
            ? JSON.stringify(
                  certificationsText
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
              )
            : null;

        // Upload avatar if provided
        let avatarUrl: string | null = userInfo.avatar_url || null;
        if (avatarFile && avatarFile.size > 0) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } =
                await authenticatedSupabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile, {
                        cacheControl: '3600',
                        upsert: true,
                    });

            if (uploadError) {
                console.log({
                    uploadError,
                });
                if (uploadError.message?.includes('row-level security')) {
                    return httpResponse.fail(
                        'Không thể upload avatar. Vui lòng kiểm tra cấu hình quyền truy cập storage bucket "avatars" trong Supabase.',
                        500
                    );
                }
                return httpResponse.fail(
                    `Lỗi khi upload avatar: ${uploadError.message}`,
                    500
                );
            }

            const {
                data: { publicUrl },
            } = authenticatedSupabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            avatarUrl = publicUrl;
        }

        // Update user_info
        const updateData: { full_name?: string; avatar_url?: string | null } =
            {};
        if (fullName !== null && fullName !== userInfo.full_name) {
            updateData.full_name = fullName;
        }
        if (avatarUrl !== null && avatarUrl !== userInfo.avatar_url) {
            updateData.avatar_url = avatarUrl;
        }

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await authenticatedSupabase
                .from('user_info')
                .update(updateData)
                .eq('user_id', session.user.id);

            if (updateError) {
                return httpResponse.fail(
                    `Lỗi khi cập nhật thông tin: ${updateError.message}`,
                    500
                );
            }
        }

        // Upload cover image if provided
        let coverImageUrl: string | null = userProfile?.portfolio_url || null;

        if (coverImageFile && coverImageFile.size > 0) {
            const fileExt = coverImageFile.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } =
                await authenticatedSupabase.storage
                    .from('cover-images')
                    .upload(filePath, coverImageFile, {
                        cacheControl: '3600',
                        upsert: true,
                    });

            if (uploadError) {
                if (uploadError.message?.includes('row-level security')) {
                    return httpResponse.fail(
                        'Không thể upload ảnh bìa. Vui lòng kiểm tra cấu hình quyền truy cập storage bucket "cover-images" trong Supabase.',
                        500
                    );
                }
                return httpResponse.fail(
                    `Lỗi khi upload ảnh bìa: ${uploadError.message}`,
                    500
                );
            }

            const {
                data: { publicUrl },
            } = authenticatedSupabase.storage
                .from('cover-images')
                .getPublicUrl(filePath);
            coverImageUrl = publicUrl;
        }

        // Update or insert user_profiles
        const { data: existingProfile } = await authenticatedSupabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .is('deleted_at', null)
            .maybeSingle();

        if (existingProfile) {
            const { error: profileError } = await authenticatedSupabase
                .from('user_profiles')
                .update({
                    phone: phone || null,
                    bio: bio || null,
                    address: address || null,
                    portfolio_url: coverImageUrl || null,
                    interests: interests || null,
                    experiences: experiences || null,
                    projects: projects || null,
                    certifications: certifications || null,
                })
                .eq('id', existingProfile.id);

            if (profileError) {
                return httpResponse.fail(
                    `Lỗi khi cập nhật profile: ${profileError.message}`,
                    500
                );
            }
        } else {
            const { error: insertError } = await authenticatedSupabase
                .from('user_profiles')
                .insert({
                    user_id: session.user.id,
                    phone: phone || null,
                    bio: bio || null,
                    address: address || null,
                    portfolio_url: coverImageUrl || null,
                    interests: interests || null,
                    experiences: experiences || null,
                    projects: projects || null,
                    certifications: certifications || null,
                });

            if (insertError) {
                return httpResponse.fail(
                    `Lỗi khi tạo profile: ${insertError.message}`,
                    500
                );
            }
        }

        // Update user_skills
        const { data: currentSkills } = await authenticatedSupabase
            .from('user_skills')
            .select('skill_id')
            .eq('user_id', session.user.id)
            .is('deleted_at', null);

        const currentSkillIds = new Set(
            (currentSkills || []).map((s) => s.skill_id.toString())
        );
        const newSkillIds = new Set(skillIds);

        // Delete removed skills
        const skillsToDelete = Array.from(currentSkillIds).filter(
            (id) => !newSkillIds.has(id)
        );
        if (skillsToDelete.length > 0) {
            const { error: deleteError } = await authenticatedSupabase
                .from('user_skills')
                .update({ deleted_at: new Date().toISOString() })
                .eq('user_id', session.user.id)
                .in(
                    'skill_id',
                    skillsToDelete.map((id) => parseInt(id))
                )
                .is('deleted_at', null);

            if (deleteError) {
                return httpResponse.fail(
                    `Lỗi khi xóa kỹ năng: ${deleteError.message}`,
                    500
                );
            }
        }

        // Insert new skills
        const skillsToInsert = Array.from(newSkillIds)
            .filter((id) => !currentSkillIds.has(id))
            .map((skillId) => ({
                user_id: session.user.id,
                skill_id: parseInt(skillId),
            }));

        if (skillsToInsert.length > 0) {
            const { error: insertError } = await authenticatedSupabase
                .from('user_skills')
                .insert(skillsToInsert);

            if (insertError) {
                return httpResponse.fail(
                    `Lỗi khi thêm kỹ năng: ${insertError.message}`,
                    500
                );
            }
        }

        return httpResponse.ok(
            { username: userInfo.username },
            'Cập nhật profile thành công',
            200
        );
    } catch (error) {
        console.error('Error updating profile:', error);
        return httpResponse.fail(
            'Lỗi khi cập nhật profile: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
