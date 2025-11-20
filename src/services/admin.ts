import { supabase } from '@/lib/supabase';
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
    userId: string,
    updates: {
        role?: string;
        deleted_at?: string | null;
    }
): Promise<boolean> {
    const { error } = await supabase
        .from('user_info')
        .update(updates)
        .eq('user_id', userId);

    if (error) {
        console.error('Error updating user:', error);
        return false;
    }

    return true;
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
export async function approveProject(projectId: number): Promise<boolean> {
    const { error, data } = await supabase
        .from('projects')
        .update({ status: 'approved' })
        .eq('id', projectId);

    if (error) {
        console.error('Error approving project:', error);
        return false;
    }
    return true;
}

/**
 * Reject a project (soft delete)
 */
export async function rejectProject(projectId: number): Promise<boolean> {
    const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

    if (error) {
        console.error('Error rejecting project:', error);
        return false;
    }

    return true;
}
