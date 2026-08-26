import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Các hàm ghi bắt buộc nhận client đã đăng nhập. Nếu ghi bằng client ẩn danh,
 * RLS chặn lại nhưng PostgREST trả về 0 dòng mà KHÔNG báo lỗi, khiến API vẫn
 * trả success trong khi dữ liệu không hề thay đổi.
 */
type WriteClient = SupabaseClient<Database>;
import type { Tables } from '@/types/database.types';

export type UserInfo = Pick<
    Tables<'user_info'>,
    | 'user_id'
    | 'username'
    | 'email'
    | 'full_name'
    | 'role'
    | 'created_at'
    | 'avatar_url'
>;

export type ProjectInfo = Pick<
    Tables<'projects'>,
    'id' | 'title' | 'description' | 'status' | 'created_at' | 'owner_id'
> & {
    owner: Pick<Tables<'user_info'>, 'username' | 'full_name' | 'email'> | null;
};

/**
 * Get all users (for admin)
 */
export async function getAllUsers(): Promise<UserInfo[]> {
    const { data, error } = await supabase
        .from('user_info')
        .select(
            'user_id, username, email, full_name, role, created_at, avatar_url'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data || [];
}

/**
 * Update user (lock/unlock, delete, change role)
 */
export async function updateUser(
    client: WriteClient,
    userId: string,
    updates: {
        role?: string;
        deleted_at?: string | null;
    }
): Promise<boolean> {
    const { data, error } = await client
        .from('user_info')
        .update(updates)
        .eq('user_id', userId)
        .select('user_id');

    if (error) {
        console.error('Error updating user:', error);
        return false;
    }

    return (data?.length ?? 0) > 0;
}

/**
 * Get pending projects (for admin approval)
 */
export async function getPendingProjects(): Promise<ProjectInfo[]> {
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, title, description, status, created_at, owner_id')
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending projects:', error);
        return [];
    }

    if (!projects || projects.length === 0) {
        return [];
    }

    // Fetch owner info
    const ownerIds = [...new Set(projects.map((p) => p.owner_id))];
    const { data: ownersData } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, email')
        .in('user_id', ownerIds)
        .is('deleted_at', null);

    const ownersMap = new Map(
        (ownersData || []).map((owner) => [owner.user_id, owner])
    );

    return projects.map((project) => ({
        ...project,
        owner: ownersMap.get(project.owner_id) || null,
    }));
}

/**
 * Approve a project
 */
export async function approveProject(
    client: WriteClient,
    projectId: number
): Promise<boolean> {
    const { data, error } = await client
        .from('projects')
        .update({ status: 'approved' })
        .eq('id', projectId)
        .select('id');

    if (error) {
        console.error('Error approving project:', error);
        return false;
    }

    return (data?.length ?? 0) > 0;
}

/**
 * Reject a project (soft delete)
 */
/**
 * Từ chối dự án.
 *
 * Trước đây hàm này ghi thẳng `deleted_at`, tức là xoá mềm. Nhưng thông báo
 * gửi cho chủ dự án lại nói "Vui lòng kiểm tra và chỉnh sửa lại dự án", trong
 * khi mọi truy vấn đều lọc `deleted_at is null` nên dự án biến mất khỏi cả tab
 * "Dự án của tôi" — không còn đường nào sửa. Nay chỉ đổi trạng thái để chủ dự
 * án sửa rồi nộp lại.
 */
export async function rejectProject(
    client: WriteClient,
    projectId: number
): Promise<boolean> {
    const { data, error } = await client
        .from('projects')
        .update({ status: 'rejected' })
        .eq('id', projectId)
        .select('id');

    if (error) {
        console.error('Error rejecting project:', error);
        return false;
    }

    return (data?.length ?? 0) > 0;
}
