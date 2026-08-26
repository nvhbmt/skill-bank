export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { createProjectSchema } from '@/schemas/project';
import normalizeZodError from '@/utils/normalizeZodError';
import httpResponse from '@/utils/response';

export const PUT: APIRoute = async ({ params, request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail(
                'Bạn cần đăng nhập để cập nhật dự án',
                401
            );
        }

        const authenticatedSupabase = createAuthenticatedClient(session);

        const projectId = parseInt(params?.projectId || '0');
        if (isNaN(projectId) || projectId <= 0) {
            return httpResponse.fail('ID dự án không hợp lệ', 400);
        }

        // Check if user is project owner
        const { data: project, error: projectError } =
            await authenticatedSupabase
                .from('projects')
                .select('owner_id, status')
                .eq('id', projectId)
                .is('deleted_at', null)
                .single();

        if (projectError || !project) {
            return httpResponse.fail('Dự án không tồn tại', 404);
        }

        if (project.owner_id !== session.user.id) {
            return httpResponse.fail(
                'Bạn không có quyền cập nhật dự án này',
                403
            );
        }

        // Dự án đã kết thúc thì không sửa nữa
        if (project.status === 'completed') {
            return httpResponse.fail('Dự án đã kết thúc, không sửa được', 400);
        }

        const formData = await request.formData();
        const coverImage = formData.get('cover_image') as File | null;

        // Validate basic fields
        const validated = createProjectSchema.safeParse({
            project_name: formData.get('project_name'),
            location: formData.get('location'),
            category: formData.get('category'),
            start_date: formData.get('start_date'),
            description: formData.get('description'),
            terms: 'on', // Not required for update
        });

        if (!validated.success) {
            return httpResponse.fail(
                'Thông tin dự án không hợp lệ',
                400,
                normalizeZodError(validated)
            );
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

        // Update project
        const updateData: any = {
            title: validated.data.project_name,
            description: validated.data.description || null,
            location: validated.data.location || null,
            project_type: validated.data.category,
            start_date: validated.data.start_date,
        };

        if (coverImageUrl) {
            updateData.cover_image_url = coverImageUrl;
        }

        const { error: updateError } = await authenticatedSupabase
            .from('projects')
            .update(updateData)
            .eq('id', projectId);

        if (updateError) {
            return httpResponse.fail(
                'Lỗi khi cập nhật dự án: ' + updateError.message,
                500
            );
        }

        // Extract skills with descriptions from form data
        const skills: Array<{ name: string; description?: string }> = [];
        const milestones: string[] = [];

        for (const [key, value] of formData.entries()) {
            if (
                key.startsWith('skill-') &&
                !key.includes('-description') &&
                value
            ) {
                const skillValue = value.toString().trim();
                if (skillValue) {
                    const skillIndex = key.replace('skill-', '');
                    const descriptionKey = `skill-${skillIndex}-description`;
                    const description =
                        formData.get(descriptionKey)?.toString().trim() || null;

                    skills.push({
                        name: skillValue,
                        description: description || undefined,
                    });
                }
            }
            if (key.startsWith('milestone-') && value) {
                const milestoneValue = value.toString().trim();
                if (milestoneValue) {
                    milestones.push(milestoneValue);
                }
            }
        }

        // Update project skills
        if (skills.length > 0) {
            // Delete existing project skills
            await authenticatedSupabase
                .from('project_skills')
                .delete()
                .eq('project_id', projectId);

            const skillMap = new Map<
                string,
                { id: number; description?: string }
            >();

            // Find or create skills
            for (const skill of skills) {
                const { data: existingSkill } = await authenticatedSupabase
                    .from('skills')
                    .select('id, name')
                    .ilike('name', skill.name)
                    .maybeSingle();

                if (existingSkill) {
                    skillMap.set(skill.name.toLowerCase(), {
                        id: existingSkill.id,
                        description: skill.description,
                    });
                } else {
                    const { data: newSkill, error: createError } =
                        await authenticatedSupabase
                            .from('skills')
                            .insert({
                                name:
                                    skill.name.charAt(0).toUpperCase() +
                                    skill.name.slice(1).toLowerCase(),
                            })
                            .select()
                            .single();

                    if (createError || !newSkill) {
                        console.warn(
                            `Không thể tạo kỹ năng ${skill.name}:`,
                            createError?.message
                        );
                        continue;
                    }

                    skillMap.set(skill.name.toLowerCase(), {
                        id: newSkill.id,
                        description: skill.description,
                    });
                }
            }

            // Insert new project skills
            if (skillMap.size > 0) {
                const projectSkills = Array.from(skillMap.values()).map(
                    (skillData) => ({
                        project_id: projectId,
                        skill_id: skillData.id,
                        description: skillData.description || null,
                    })
                );

                const { error: projectSkillsError } =
                    await authenticatedSupabase
                        .from('project_skills')
                        .insert(projectSkills);

                if (projectSkillsError) {
                    return httpResponse.fail(
                        'Lỗi khi cập nhật kỹ năng: ' +
                            projectSkillsError.message,
                        500
                    );
                }
            }
        } else {
            // Delete all skills if none provided
            await authenticatedSupabase
                .from('project_skills')
                .delete()
                .eq('project_id', projectId);
        }

        // Cập nhật mốc theo vị trí, KHÔNG xoá rồi tạo lại: cột completed_at
        // (đánh dấu mốc đã hoàn thành, dùng để tính tiến độ) sẽ mất sạch nếu
        // xoá — chủ dự án chỉ sửa cái tên cũng làm tiến độ tụt về 0%.
        const cleanMilestones = milestones
            .map((m) => m.trim())
            .filter((m) => m.length > 0);

        const { data: existingMilestones } = await authenticatedSupabase
            .from('project_milestones')
            .select('id, order_index')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        const existingByOrder = new Map(
            (existingMilestones || []).map((m) => [m.order_index, m.id])
        );

        // Cập nhật hoặc chèn từng vị trí; giữ nguyên completed_at của dòng cũ
        for (let index = 0; index < cleanMilestones.length; index++) {
            const orderIndex = index + 1;
            const title = cleanMilestones[index];
            const existingId = existingByOrder.get(orderIndex);

            if (existingId) {
                await authenticatedSupabase
                    .from('project_milestones')
                    .update({ title })
                    .eq('id', existingId);
                existingByOrder.delete(orderIndex);
            } else {
                await authenticatedSupabase
                    .from('project_milestones')
                    .insert({
                        project_id: projectId,
                        title,
                        order_index: orderIndex,
                    });
            }
        }

        // Xoá các mốc dư ra so với danh sách mới
        const leftoverIds = [...existingByOrder.values()];
        if (leftoverIds.length > 0) {
            await authenticatedSupabase
                .from('project_milestones')
                .delete()
                .in('id', leftoverIds);
        }

        // Dự án bị từ chối, sau khi sửa thì tự đưa lại vào hàng chờ duyệt
        let resubmitted = false;
        if (project.status === 'rejected') {
            const { data: requeued } = await authenticatedSupabase
                .from('projects')
                .update({ status: 'pending' })
                .eq('id', projectId)
                .select('id');
            resubmitted = (requeued?.length ?? 0) > 0;
        }

        return httpResponse.ok(
            { project_id: projectId, resubmitted },
            resubmitted
                ? 'Đã cập nhật và gửi lại dự án để duyệt'
                : 'Cập nhật dự án thành công',
            200
        );
    } catch (error) {
        console.error('Error updating project:', error);
        return httpResponse.fail(
            'Lỗi khi cập nhật dự án: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
