import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

type WriteClient = SupabaseClient<Database>;

export type DisputeStatus = 'open' | 'resolved' | 'rejected';

export type DisputeWithContext = Pick<
    Tables<'disputes'>,
    'id' | 'description' | 'status' | 'created_at' | 'project_id'
> & {
    project_title: string | null;
    raised_by: Pick<
        Tables<'user_info'>,
        'user_id' | 'username' | 'full_name' | 'avatar_url'
    > | null;
};

const FIELDS = 'id, description, status, created_at, project_id, raised_by_id';

async function decorate(
    rows: Array<{
        id: number;
        description: string | null;
        status: string | null;
        created_at: string | null;
        project_id: number;
        raised_by_id: string;
    }>
): Promise<DisputeWithContext[]> {
    if (rows.length === 0) return [];

    const projectIds = [...new Set(rows.map((r) => r.project_id))];
    const userIds = [...new Set(rows.map((r) => r.raised_by_id))];

    const [{ data: projects }, { data: users }] = await Promise.all([
        supabase.from('projects').select('id, title').in('id', projectIds),
        supabase
            .from('user_info')
            .select('user_id, username, full_name, avatar_url')
            .in('user_id', userIds),
    ]);

    const projectMap = new Map((projects || []).map((p) => [p.id, p.title]));
    const userMap = new Map((users || []).map((u) => [u.user_id, u]));

    return rows.map((row) => ({
        id: row.id,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        project_id: row.project_id,
        project_title: projectMap.get(row.project_id) ?? null,
        raised_by: userMap.get(row.raised_by_id) ?? null,
    }));
}

/** Toàn bộ khiếu nại, dành cho trang quản trị */
export async function getAllDisputes(): Promise<DisputeWithContext[]> {
    const { data, error } = await supabase
        .from('disputes')
        .select(FIELDS)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading disputes:', error);
        return [];
    }

    return decorate(data || []);
}

/** Khiếu nại của một dự án, dành cho thành viên dự án đó */
export async function getProjectDisputes(
    projectId: number
): Promise<DisputeWithContext[]> {
    const { data, error } = await supabase
        .from('disputes')
        .select(FIELDS)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading project disputes:', error);
        return [];
    }

    return decorate(data || []);
}

export async function createDispute(
    client: WriteClient,
    params: { projectId: number; raisedById: string; description: string }
): Promise<{ ok: boolean; id?: number; error?: string }> {
    const { data, error } = await client
        .from('disputes')
        .insert({
            project_id: params.projectId,
            raised_by_id: params.raisedById,
            description: params.description,
            status: 'open',
        })
        .select('id')
        .single();

    if (error || !data) {
        return {
            ok: false,
            error: error?.message ?? 'Không tạo được khiếu nại',
        };
    }

    return { ok: true, id: data.id };
}

export async function resolveDispute(
    client: WriteClient,
    disputeId: number,
    resolverId: string,
    status: 'resolved' | 'rejected'
): Promise<boolean> {
    const { data, error } = await client
        .from('disputes')
        .update({ status, resolved_by: resolverId })
        .eq('id', disputeId)
        .select('id');

    if (error) {
        console.error('Error resolving dispute:', error);
        return false;
    }

    return (data?.length ?? 0) > 0;
}
