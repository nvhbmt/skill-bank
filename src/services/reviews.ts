import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

type WriteClient = SupabaseClient<Database>;

export type ProjectReview = Pick<
    Tables<'reviews'>,
    'id' | 'rating' | 'comment' | 'created_at' | 'reviewer_id' | 'reviewee_id'
>;

export type ReviewTarget = Pick<
    Tables<'user_info'>,
    'user_id' | 'username' | 'full_name' | 'avatar_url'
> & {
    role: string | null;
    /** Đánh giá mà người đang xem đã gửi cho người này (nếu có) */
    myReview: ProjectReview | null;
};

/**
 * Danh sách người mà `viewerId` có thể đánh giá trong một dự án: mọi thành viên
 * đang hoạt động trừ chính mình, kèm đánh giá đã gửi trước đó (nếu có) để form
 * hiển thị đúng trạng thái.
 */
export async function getReviewTargets(
    projectId: number,
    viewerId: string
): Promise<ReviewTarget[]> {
    const { data: members } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .is('left_at', null);

    const others = (members || []).filter((m) => m.user_id !== viewerId);
    if (others.length === 0) return [];

    const ids = others.map((m) => m.user_id);

    const { data: infos } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', ids)
        .is('deleted_at', null);

    const { data: myReviews } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id, reviewee_id')
        .eq('project_id', projectId)
        .eq('reviewer_id', viewerId)
        .in('reviewee_id', ids)
        .is('deleted_at', null);

    const infoMap = new Map((infos || []).map((i) => [i.user_id, i]));
    const reviewMap = new Map((myReviews || []).map((r) => [r.reviewee_id, r]));

    return others
        .map((member) => {
            const info = infoMap.get(member.user_id);
            if (!info) return null;
            return {
                ...info,
                role: member.role,
                myReview: reviewMap.get(member.user_id) ?? null,
            };
        })
        .filter((m): m is ReviewTarget => m !== null);
}

/**
 * Gửi hoặc cập nhật đánh giá. Một người chỉ đánh giá một người khác một lần
 * trên mỗi dự án (ràng buộc unique ở DB), nên gửi lại là cập nhật.
 */
export async function upsertReview(
    client: WriteClient,
    params: {
        projectId: number;
        reviewerId: string;
        revieweeId: string;
        rating: number;
        comment: string | null;
    }
): Promise<{ ok: boolean; error?: string }> {
    const { data: existing } = await client
        .from('reviews')
        .select('id')
        .eq('project_id', params.projectId)
        .eq('reviewer_id', params.reviewerId)
        .eq('reviewee_id', params.revieweeId)
        .is('deleted_at', null)
        .maybeSingle();

    if (existing) {
        const { data, error } = await client
            .from('reviews')
            .update({ rating: params.rating, comment: params.comment })
            .eq('id', existing.id)
            .select('id');

        if (error || !data || data.length === 0) {
            return {
                ok: false,
                error: error?.message ?? 'Không cập nhật được',
            };
        }
        return { ok: true };
    }

    const { data, error } = await client
        .from('reviews')
        .insert({
            project_id: params.projectId,
            reviewer_id: params.reviewerId,
            reviewee_id: params.revieweeId,
            rating: params.rating,
            comment: params.comment,
        })
        .select('id');

    if (error || !data || data.length === 0) {
        return {
            ok: false,
            error: error?.message ?? 'Không gửi được đánh giá',
        };
    }

    return { ok: true };
}
