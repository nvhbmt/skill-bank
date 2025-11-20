export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập để ứng tuyển', 401);
        }

        // Create authenticated Supabase client
        const authenticatedSupabase = createAuthenticatedClient(session);

        const formData = await request.formData();
        const projectId = formData.get('project_id');
        const coverLetter = formData.get('cover_letter') as string | null;
        const cvFile = formData.get('cv_file') as File | null;

        // Validate project_id
        if (!projectId) {
            return httpResponse.fail('Thiếu thông tin dự án', 400);
        }

        const projectIdNum = parseInt(projectId.toString());
        if (isNaN(projectIdNum)) {
            return httpResponse.fail('ID dự án không hợp lệ', 400);
        }

        // Check if project exists
        const { data: project, error: projectError } =
            await authenticatedSupabase
                .from('projects')
                .select('id, owner_id, status')
                .eq('id', projectIdNum)
                .is('deleted_at', null)
                .single();

        if (projectError || !project) {
            return httpResponse.fail('Dự án không tồn tại', 404);
        }

        // Check if project is approved (only approved projects accept applications)
        if (project.status !== 'approved') {
            return httpResponse.fail('Dự án không còn nhận ứng viên', 400);
        }

        // Check if user is the owner
        if (project.owner_id === session.user.id) {
            return httpResponse.fail(
                'Bạn không thể ứng tuyển cho dự án của chính mình',
                400
            );
        }

        // Check if user already applied
        const { data: existingApplication } = await authenticatedSupabase
            .from('applications')
            .select('id')
            .eq('project_id', projectIdNum)
            .eq('applicant_id', session.user.id)
            .is('deleted_at', null)
            .maybeSingle();

        if (existingApplication) {
            return httpResponse.fail('Bạn đã ứng tuyển cho dự án này rồi', 400);
        }

        // Upload CV file if provided
        let cvUrl: string | null = null;
        if (cvFile && cvFile.size > 0) {
            const fileExt = cvFile.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } =
                await authenticatedSupabase.storage
                    .from('cv-files')
                    .upload(filePath, cvFile, {
                        cacheControl: '3600',
                        upsert: false,
                    });

            if (uploadError) {
                return httpResponse.fail(
                    'Lỗi khi tải lên CV: ' + uploadError.message,
                    500
                );
            }

            const {
                data: { publicUrl },
            } = authenticatedSupabase.storage
                .from('cv-files')
                .getPublicUrl(filePath);
            cvUrl = publicUrl;
        }

        // Create application
        const { data: application, error: applicationError } =
            await authenticatedSupabase
                .from('applications')
                .insert({
                    project_id: projectIdNum,
                    applicant_id: session.user.id,
                    cover_letter: coverLetter || null,
                    applied_at: new Date().toISOString(),
                    status: 'pending',
                })
                .select()
                .single();

        if (applicationError || !application) {
            return httpResponse.fail(
                'Lỗi khi gửi đơn ứng tuyển: ' + applicationError?.message,
                500
            );
        }

        return httpResponse.ok(
            {
                application_id: application.id,
            },
            'Gửi đơn ứng tuyển thành công',
            200
        );
    } catch (error) {
        console.error('Error submitting application:', error);
        return httpResponse.fail(
            'Lỗi khi gửi đơn ứng tuyển: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};

