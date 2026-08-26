import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

type WriteClient = SupabaseClient<Database>;

export type ContractWithMember = Pick<
    Tables<'contracts'>,
    | 'id'
    | 'project_id'
    | 'member_id'
    | 'terms'
    | 'start_date'
    | 'end_date'
    | 'status'
> & {
    member: Pick<
        Tables<'user_info'>,
        'user_id' | 'username' | 'full_name' | 'avatar_url'
    > | null;
    deliveries: Array<
        Pick<
            Tables<'deliveries'>,
            'id' | 'description' | 'delivery_date' | 'status'
        >
    >;
};

const FIELDS = 'id, project_id, member_id, terms, start_date, end_date, status';

/**
 * Hợp đồng của một dự án, kèm thông tin thành viên và các lần bàn giao đã
 * được nghiệm thu (bảng `deliveries`).
 */
export async function getProjectContracts(
    projectId: number
): Promise<ContractWithMember[]> {
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(FIELDS)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('id', { ascending: true });

    if (error) {
        console.error('Error loading contracts:', error);
        return [];
    }
    if (!contracts || contracts.length === 0) return [];

    const memberIds = [...new Set(contracts.map((c) => c.member_id))];
    const contractIds = contracts.map((c) => c.id);

    const [{ data: members }, { data: deliveries }] = await Promise.all([
        supabase
            .from('user_info')
            .select('user_id, username, full_name, avatar_url')
            .in('user_id', memberIds)
            .is('deleted_at', null),
        supabase
            .from('deliveries')
            .select('id, contract_id, description, delivery_date, status')
            .in('contract_id', contractIds)
            .is('deleted_at', null)
            .order('delivery_date', { ascending: false }),
    ]);

    const memberMap = new Map((members || []).map((m) => [m.user_id, m]));
    const deliveryMap = new Map<number, ContractWithMember['deliveries']>();
    (deliveries || []).forEach((d) => {
        const list = deliveryMap.get(d.contract_id) ?? [];
        list.push({
            id: d.id,
            description: d.description,
            delivery_date: d.delivery_date,
            status: d.status,
        });
        deliveryMap.set(d.contract_id, list);
    });

    return contracts.map((contract) => ({
        ...contract,
        member: memberMap.get(contract.member_id) ?? null,
        deliveries: deliveryMap.get(contract.id) ?? [],
    }));
}

/**
 * Tạo hoặc cập nhật hợp đồng giữa chủ dự án và một thành viên.
 */
export async function upsertContract(
    client: WriteClient,
    params: {
        projectId: number;
        memberId: string;
        terms: string | null;
        startDate: string | null;
        endDate: string | null;
    }
): Promise<{ ok: boolean; id?: number; error?: string }> {
    const { data: existing } = await client
        .from('contracts')
        .select('id')
        .eq('project_id', params.projectId)
        .eq('member_id', params.memberId)
        .is('deleted_at', null)
        .maybeSingle();

    const payload = {
        terms: params.terms,
        start_date: params.startDate,
        end_date: params.endDate,
        status: 'active',
    };

    if (existing) {
        const { data, error } = await client
            .from('contracts')
            .update(payload)
            .eq('id', existing.id)
            .select('id');

        if (error || !data || data.length === 0) {
            return {
                ok: false,
                error: error?.message ?? 'Không cập nhật được hợp đồng',
            };
        }
        return { ok: true, id: existing.id };
    }

    const { data, error } = await client
        .from('contracts')
        .insert({
            project_id: params.projectId,
            member_id: params.memberId,
            ...payload,
        })
        .select('id')
        .single();

    if (error || !data) {
        return {
            ok: false,
            error: error?.message ?? 'Không tạo được hợp đồng',
        };
    }

    return { ok: true, id: data.id };
}

/**
 * Ghi nhận một lần bàn giao đã nghiệm thu vào hợp đồng của thành viên.
 *
 * Bảng `deliveries` là bản ghi chính thức của việc bàn giao; nội dung lấy từ
 * ghi chú bàn giao mà thành viên đã gửi. Nếu thành viên chưa có hợp đồng thì
 * bỏ qua, vì hợp đồng là tuỳ chọn.
 */
export async function recordDelivery(
    client: WriteClient,
    params: { projectId: number; memberId: string; description: string | null }
): Promise<boolean> {
    const { data: contract } = await client
        .from('contracts')
        .select('id')
        .eq('project_id', params.projectId)
        .eq('member_id', params.memberId)
        .is('deleted_at', null)
        .maybeSingle();

    if (!contract) return false;

    const { error } = await client.from('deliveries').insert({
        contract_id: contract.id,
        description: params.description,
        delivery_date: new Date().toISOString().slice(0, 10),
        status: 'accepted',
    });

    if (error) {
        console.error('Error recording delivery:', error);
        return false;
    }

    return true;
}
