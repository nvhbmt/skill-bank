export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '@/lib/supabase';
import { notifyReviewReceived } from '@/services/notifications';
import { upsertReview } from '@/services/reviews';
import httpResponse from '@/utils/response';

/**
 * Gửi đánh giá cho một thành viên khác sau khi dự án kết thúc.
 * FAQ đã hứa tính năng này ("Sau khi kết thúc dự án, bạn có thể đánh giá...")
 * nhưng trước đây bảng reviews chỉ được đọc, không có đường nào ghi vào.
 */
export const POST: APIRoute = async ({ request, params, locals }) => {
    try {
        const session = locals.session;
        if (!session?.user) {
            return httpResponse.fail('Bạn cần đăng nhập', 401);
        }

        const projectId = Number.parseInt(params.projectId ?? '', 10);
        if (!Number.isFinite(projectId)) {
            return httpResponse.fail('Dự án không hợp lệ', 400);
        }

        const body = await request.json().catch(() => ({}));
        const revieweeId = String(body.reviewee_id ?? '').trim();
        const rating = Number.parseInt(String(body.rating ?? ''), 10);
        const comment =
            typeof body.comment === 'string'
                ? body.comment.trim().slice(0, 2000)
                : '';

        if (!revieweeId) {
            return httpResponse.fail('Thiếu người được đánh giá', 400);
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return httpResponse.fail('Điểm đánh giá phải từ 1 đến 5', 400);
        }
        if (revieweeId === session.user.id) {
            return httpResponse.fail('Bạn không thể tự đánh giá mình', 400);
        }

        const supabase = createAuthenticatedClient(session);

        const { data: project } = await supabase
            .from('projects')
            .select('id, title, status')
            .eq('id', projectId)
            .is('deleted_at', null)
            .maybeSingle();

        if (!project) {
            return httpResponse.fail('Không tìm thấy dự án', 404);
        }
        if (project.status !== 'completed') {
            return httpResponse.fail(
                'Chỉ đánh giá được sau khi dự án kết thúc',
                400
            );
        }

        // Cả người đánh giá lẫn người được đánh giá phải là thành viên dự án
        const { data: memberships } = await supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', projectId)
            .in('user_id', [session.user.id, revieweeId])
            .is('deleted_at', null)
            .is('left_at', null);

        const ids = new Set((memberships || []).map((m) => m.user_id));
        if (!ids.has(session.user.id)) {
            return httpResponse.fail(
                'Bạn không phải thành viên của dự án này',
                403
            );
        }
        if (!ids.has(revieweeId)) {
            return httpResponse.fail(
                'Người được đánh giá không thuộc dự án này',
                400
            );
        }

        const result = await upsertReview(supabase, {
            projectId,
            reviewerId: session.user.id,
            revieweeId,
            rating,
            comment: comment || null,
        });

        if (!result.ok) {
            return httpResponse.fail(
                'Lỗi khi gửi đánh giá: ' + (result.error ?? ''),
                500
            );
        }

        const { data: reviewerInfo } = await supabase
            .from('user_info')
            .select('full_name, username')
            .eq('user_id', session.user.id)
            .maybeSingle();

        await notifyReviewReceived(
            revieweeId,
            reviewerInfo?.full_name || reviewerInfo?.username || 'Thành viên',
            projectId,
            project.title
        );

        return httpResponse.ok(null, 'Đã gửi đánh giá', 200);
    } catch (error) {
        console.error('Error submitting review:', error);
        return httpResponse.fail(
            'Lỗi khi gửi đánh giá: ' +
                (error instanceof Error ? error.message : 'Unknown error'),
            500
        );
    }
};
