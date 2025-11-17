export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { createProjectSchema } from '@/schemas/project';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập để tạo dự án', 401);
        }

        // Create authenticated Supabase client
        const authenticatedSupabase = createAuthenticatedClient(session);

        const formData = await request.formData();
        const coverImage = formData.get('cover_image') as File | null;

        // Validate basic fields
        const validated = createProjectSchema.safeParse({
            project_name: formData.get('project_name'),
            location: formData.get('location'),
            category: formData.get('category'),
            start_date: formData.get('start_date'),
            description: formData.get('description'),
            terms: formData.get('terms'),
        });

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin dự án không hợp lệ',
                400,
                normalizeZodError(validated)
            );
        }

        // Extract skills and milestones from form data
        const skills: string[] = [];
        const milestones: string[] = [];

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('skill-') && value) {
                const skillValue = value.toString().trim();
                if (skillValue) {
                    skills.push(skillValue);
                }
            }
            if (key.startsWith('milestone-') && value) {
                const milestoneValue = value.toString().trim();
                if (milestoneValue) {
                    milestones.push(milestoneValue);
                }
            }
        }

        // Upload cover image if provided
        let coverImageUrl: string | null = null;
        if (coverImage && coverImage.size > 0) {
            const fileExt = coverImage.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } =
                await authenticatedSupabase.storage
                    .from('project-covers')
                    .upload(filePath, coverImage, {
                        cacheControl: '3600',
                        upsert: false,
                    });

            if (uploadError) {
                return httpResponse.fail(
                    'Lỗi khi tải lên ảnh bìa: ' + uploadError.message,
                    500
                );
            }

            const {
                data: { publicUrl },
            } = authenticatedSupabase.storage
                .from('project-covers')
                .getPublicUrl(filePath);
            coverImageUrl = publicUrl;
        }

        // Create project
        // Note: status values are likely: 'open', 'closed', 'draft', 'completed'
        // Using 'open' for newly created projects, or null if status is optional
        const { data: project, error: projectError } =
            await authenticatedSupabase
                .from('projects')
                .insert({
                    title: validated.data.project_name,
                    description: validated.data.description || null,
                    location: validated.data.location || null,
                    project_type: validated.data.category,
                    start_date: validated.data.start_date,
                    cover_image_url: coverImageUrl,
                    owner_id: session.user.id,
                    status: 'open', // Changed from 'active' to 'open'
                })
                .select()
                .single();

        if (projectError || !project) {
            return httpResponse.fail(
                'Lỗi khi tạo dự án: ' + projectError?.message,
                500
            );
        }

        // Handle skills - create or find existing skills
        if (skills.length > 0) {
            const skillMap = new Map<string, number>();

            // First, try to find existing skills (case-insensitive)
            for (const skillName of skills) {
                const { data: existingSkill } = await authenticatedSupabase
                    .from('skills')
                    .select('id, name')
                    .ilike('name', skillName)
                    .maybeSingle();

                if (existingSkill) {
                    skillMap.set(skillName.toLowerCase(), existingSkill.id);
                } else {
                    // Create new skill if it doesn't exist
                    const { data: newSkill, error: createError } =
                        await authenticatedSupabase
                            .from('skills')
                            .insert({
                                name:
                                    skillName.charAt(0).toUpperCase() +
                                    skillName.slice(1).toLowerCase(),
                            })
                            .select()
                            .single();

                    if (createError || !newSkill) {
                        console.warn(
                            `Không thể tạo kỹ năng ${skillName}:`,
                            createError?.message
                        );
                        continue;
                    }

                    skillMap.set(skillName.toLowerCase(), newSkill.id);
                }
            }

            // Create project_skills entries
            if (skillMap.size > 0) {
                const projectSkills = Array.from(skillMap.values()).map(
                    (skillId) => ({
                        project_id: project.id,
                        skill_id: skillId,
                    })
                );

                const { error: projectSkillsError } =
                    await authenticatedSupabase
                        .from('project_skills')
                        .insert(projectSkills);

                if (projectSkillsError) {
                    return httpResponse.fail(
                        'Lỗi khi thêm kỹ năng: ' + projectSkillsError.message,
                        500
                    );
                }
            }
        }

        // Create project milestones
        if (milestones.length > 0) {
            const projectMilestones = milestones
                .filter((m) => m.trim().length > 0)
                .map((milestone, index) => ({
                    project_id: project.id,
                    title: milestone.trim(),
                    order_index: index + 1,
                }));

            if (projectMilestones.length > 0) {
                const { error: milestonesError } = await authenticatedSupabase
                    .from('project_milestones')
                    .insert(projectMilestones);

                if (milestonesError) {
                    return httpResponse.fail(
                        'Lỗi khi tạo mốc thời gian: ' + milestonesError.message,
                        500
                    );
                }
            }
        }

        // Add owner as project member
        const { error: memberError } = await authenticatedSupabase
            .from('project_members')
            .insert({
                project_id: project.id,
                user_id: session.user.id,
                role: 'owner',
                joined_at: new Date().toISOString(),
            });

        if (memberError) {
            return httpResponse.fail(
                'Lỗi khi thêm thành viên: ' + memberError.message,
                500
            );
        }

        return httpResponse.ok(
            { project_id: project.id },
            'Tạo dự án thành công',
            200
        );
    } catch (error) {
        console.error('Error creating project:', error);
        return httpResponse.fail(
            'Lỗi khi tạo dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
