import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

/**
 * Ghi bằng client ẩn danh sẽ bị RLS chặn nhưng PostgREST không báo lỗi, nên
 * các hàm ghi phải nhận client đã đăng nhập từ route gọi tới.
 */
type WriteClient = SupabaseClient<Database>;

export type ApplicationWithApplicant = Pick<
    Tables<'applications'>,
    'id' | 'status' | 'applied_at' | 'cover_letter' | 'cv_url'
> & {
    applicant: Pick<
        Tables<'user_info'>,
        'user_id' | 'username' | 'full_name' | 'email' | 'avatar_url'
    > | null;
};

export type ProjectMember = Pick<
    Tables<'user_info'>,
    'user_id' | 'username' | 'full_name' | 'email' | 'avatar_url'
> & {
    role: string | null;
    handover_id?: number | null;
    handover_note: string | null;
    handover_status?: string | null;
    handover_submitted_at?: string | null;
    handover_review_note?: string | null;
};

/**
 * Get applications for a project
 */
export async function getProjectApplications(projectId: number): Promise<{
    pending: ApplicationWithApplicant[];
    approved: ApplicationWithApplicant[];
}> {
    const { data: applications, error } = await supabase
        .from('applications')
        .select('id, status, applied_at, cover_letter, cv_url, applicant_id')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('applied_at', { ascending: false });

    if (error) {
        console.error('Error fetching applications:', error);
        return { pending: [], approved: [] };
    }

    if (!applications || applications.length === 0) {
        return { pending: [], approved: [] };
    }

    // Fetch applicant info
    const applicantIds = [
        ...new Set(applications.map((app) => app.applicant_id)),
    ];
    const { data: applicantsData } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, email, avatar_url')
        .in('user_id', applicantIds)
        .is('deleted_at', null);

    const applicantsMap = new Map(
        (applicantsData || []).map((app) => [app.user_id, app])
    );

    const applicationsWithApplicants = applications.map((app) => ({
        id: app.id,
        status: app.status,
        applied_at: app.applied_at,
        cover_letter: app.cover_letter,
        cv_url: app.cv_url,
        applicant: applicantsMap.get(app.applicant_id) || null,
    }));

    const pending = applicationsWithApplicants.filter(
        (app) => app.status === 'pending' || !app.status
    );
    const approved = applicationsWithApplicants.filter(
        (app) => app.status === 'approved'
    );

    return { pending, approved };
}

/**
 * Get project members with handover notes
 */
export async function getProjectMembers(
    projectId: number
): Promise<ProjectMember[]> {
    const { data: membersData, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .is('left_at', null);

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    if (!membersData || membersData.length === 0) {
        return [];
    }

    // Fetch member info
    const memberIds = membersData.map((m) => m.user_id);
    const { data: membersInfo } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, email, avatar_url')
        .in('user_id', memberIds)
        .is('deleted_at', null);

    const membersMap = new Map((membersInfo || []).map((m) => [m.user_id, m]));

    // Lấy bản bàn giao của từng thành viên
    const { data: handovers } = await supabase
        .from('project_handovers')
        .select('id, member_id, notes, status, submitted_at, review_note')
        .eq('project_id', projectId)
        .is('deleted_at', null);

    const handoverMap = new Map((handovers || []).map((h) => [h.member_id, h]));

    return (membersData as ProjectMember[])
        .map((m) => {
            const info = membersMap.get(m.user_id);
            if (!info) return null;
            const handover = handoverMap.get(m.user_id);
            return {
                ...info,
                role: m.role,
                handover_id: handover?.id ?? null,
                handover_note: handover?.notes ?? null,
                handover_status: handover?.status ?? null,
                handover_submitted_at: handover?.submitted_at ?? null,
                handover_review_note: handover?.review_note ?? null,
            };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * Approve an application
 */
export async function approveApplication(
    client: WriteClient,
    applicationId: number,
    projectId: number
): Promise<boolean> {
    const { data: updated, error: appError } = await client
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)
        .select('id, applicant_id');

    if (appError) {
        console.error('Error approving application:', appError);
        return false;
    }

    const application = updated?.[0];
    if (!application) {
        // Không có dòng nào được cập nhật: đơn không tồn tại hoặc bị RLS chặn
        return false;
    }

    // Thêm ứng viên vào thành viên dự án nếu chưa có
    // Người từng rời dự án vẫn còn dòng project_members cũ với `left_at` đã
    // được ghi. Nếu chỉ kiểm tra `deleted_at` thì câu này tìm thấy dòng cũ và
    // bỏ qua bước thêm thành viên, khiến duyệt đơn xong họ vẫn ở ngoài dự án.
    const { data: existingMember } = await client
        .from('project_members')
        .select('id, left_at')
        .eq('project_id', projectId)
        .eq('user_id', application.applicant_id)
        .is('deleted_at', null)
        .maybeSingle();

    if (existingMember?.left_at) {
        // Từng rời dự án rồi quay lại: mở lại dòng cũ
        const { error: rejoinError } = await client
            .from('project_members')
            .update({ left_at: null, joined_at: new Date().toISOString() })
            .eq('id', existingMember.id);

        if (rejoinError) {
            console.error('Error rejoining member:', rejoinError);
        }
    } else if (!existingMember) {
        const { error: memberError } = await client
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: application.applicant_id,
                role: 'collaborator',
                joined_at: new Date().toISOString(),
            });

        if (memberError) {
            console.error('Error adding member:', memberError);
        }
    }

    return true;
}

/**
 * Reject an application
 */
export async function rejectApplication(
    client: WriteClient,
    applicationId: number
): Promise<boolean> {
    const { data, error } = await client
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId)
        .select('id');

    if (error) {
        console.error('Error rejecting application:', error);
        return false;
    }

    return (data?.length ?? 0) > 0;
}

export type HandoverStatus = 'pending' | 'approved' | 'rejected';

export type Handover = {
    id: number;
    project_id: number;
    member_id: string;
    notes: string | null;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    review_note: string | null;
};

/**
 * Lấy bản bàn giao của một thành viên trên một dự án.
 */
export async function getHandoverForMember(
    projectId: number,
    memberId: string
): Promise<Handover | null> {
    const { data, error } = await supabase
        .from('project_handovers')
        .select(
            'id, project_id, member_id, notes, status, submitted_at, reviewed_at, review_note'
        )
        .eq('project_id', projectId)
        .eq('member_id', memberId)
        .is('deleted_at', null)
        .maybeSingle();

    if (error) {
        console.error('Error fetching handover:', error);
        return null;
    }

    return data;
}

/**
 * Lấy toàn bộ bản bàn giao của một dự án (dành cho chủ dự án).
 */
export async function getProjectHandovers(
    projectId: number
): Promise<Handover[]> {
    const { data, error } = await supabase
        .from('project_handovers')
        .select(
            'id, project_id, member_id, notes, status, submitted_at, reviewed_at, review_note'
        )
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false });

    if (error) {
        console.error('Error fetching project handovers:', error);
        return [];
    }

    return data || [];
}

export type MyHandover = Handover & {
    project_title: string;
    owner_name: string | null;
};

/**
 * Danh sách bàn giao của một người trên mọi dự án họ tham gia (không phải chủ).
 * Dự án chưa gửi bàn giao vẫn xuất hiện với status = null.
 */
export async function getMyHandovers(userId: string): Promise<MyHandover[]> {
    const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .is('left_at', null);

    const projectIds = (memberships || []).map((m) => m.project_id);
    if (projectIds.length === 0) return [];

    // Chủ dự án không phải bàn giao cho chính mình
    const { data: projects } = await supabase
        .from('projects')
        .select('id, title, owner_id')
        .in('id', projectIds)
        .neq('owner_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (!projects || projects.length === 0) return [];

    const ownerIds = [...new Set(projects.map((p) => p.owner_id))];
    const { data: owners } = await supabase
        .from('user_info')
        .select('user_id, full_name, username')
        .in('user_id', ownerIds);
    const ownerMap = new Map(
        (owners || []).map((o) => [o.user_id, o.full_name || o.username])
    );

    const { data: handovers } = await supabase
        .from('project_handovers')
        .select(
            'id, project_id, member_id, notes, status, submitted_at, reviewed_at, review_note'
        )
        .eq('member_id', userId)
        .in(
            'project_id',
            projects.map((p) => p.id)
        )
        .is('deleted_at', null);

    const handoverMap = new Map(
        (handovers || []).map((h) => [h.project_id, h])
    );

    return projects.map((project) => {
        const handover = handoverMap.get(project.id);
        return {
            id: handover?.id ?? 0,
            project_id: project.id,
            member_id: userId,
            notes: handover?.notes ?? null,
            status: handover?.status ?? '',
            submitted_at: handover?.submitted_at ?? null,
            reviewed_at: handover?.reviewed_at ?? null,
            review_note: handover?.review_note ?? null,
            project_title: project.title,
            owner_name: ownerMap.get(project.owner_id) ?? null,
        };
    });
}
