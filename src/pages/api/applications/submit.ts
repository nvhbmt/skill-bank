export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import httpResponse from '@/utils/response';
import { notifyApplicationReceived } from '@/services/notifications';

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

        // Check if project exists and get title
        const { data: project, error: projectError } =
            await authenticatedSupabase
                .from('projects')
                .select('id, owner_id, status, title')
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
        // Chỉ đơn đang chờ hoặc đã được duyệt mới chặn nộp lại. Trước đây câu
        // này không xét status nên một lần bị từ chối là chặn vĩnh viễn, kể cả
        // khi dự án mở tuyển đợt mới.
        const { data: existingApplication } = await authenticatedSupabase
            .from('applications')
            .select('id, status')
            .eq('project_id', projectIdNum)
            .eq('applicant_id', session.user.id)
            .in('status', ['pending', 'approved'])
            .is('deleted_at', null)
            .maybeSingle();

        if (existingApplication) {
            return httpResponse.fail(
                existingApplication.status === 'approved'
                    ? 'Bạn đã là thành viên của dự án này'
                    : 'Bạn đã ứng tuyển cho dự án này rồi',
                400
            );
        }

        // Upload CV file if provided
        let cvUrl: string | null = null;
        if (cvFile && cvFile.size > 0) {
            const fileExt = cvFile.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await authenticatedSupabase.storage
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

            // Lưu đường dẫn trong bucket, không lưu public URL: bucket cv-files
            // là riêng tư, người xem sẽ được cấp signed URL có hạn khi cần.
            cvUrl = filePath;
        }

        // Create application
        const { data: application, error: applicationError } =
            await authenticatedSupabase
                .from('applications')
                .insert({
                    project_id: projectIdNum,
                    applicant_id: session.user.id,
                    cover_letter: coverLetter || null,
                    cv_url: cvUrl,
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

        // Get applicant info for notification
        const { data: applicantInfo, error: applicantInfoError } =
            await authenticatedSupabase
                .from('user_info')
                .select('full_name, username')
                .eq('user_id', session.user.id)
                .is('deleted_at', null)
                .maybeSingle();

        // Log error if exists but don't fail the request
        if (applicantInfoError) {
            console.error(
                'Error fetching applicant info for notification:',
                applicantInfoError
            );
        }

        // Get language from request headers or default to 'vi'
        const acceptLanguage = request.headers.get('accept-language') || '';
        const lang = acceptLanguage.includes('en') ? 'en' : 'vi';
        // Notify project owner (always notify if project title exists)
        if (project.title) {
            console.log('notifyApplicationReceived', project.title, lang);
            const applicantName =
                applicantInfo?.full_name ||
                applicantInfo?.username ||
                'Người dùng';
            const applicantUsername = applicantInfo?.username || 'unknown';

            try {
                await notifyApplicationReceived(
                    project.owner_id,
                    applicantName,
                    applicantUsername,
                    projectIdNum,
                    project.title
                );
            } catch (notificationError) {
                // Log error but don't fail the request
                console.error('Error sending notification:', notificationError);
            }
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
