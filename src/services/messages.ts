import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '@/types/database.types';

type WriteClient = SupabaseClient<Database>;

export type ChatPartner = Pick<
    Tables<'user_info'>,
    'user_id' | 'username' | 'full_name' | 'avatar_url'
>;

export type Conversation = {
    partner: ChatPartner;
    lastMessage: string;
    lastAt: string | null;
    unread: number;
};

export type ChatMessage = Pick<
    Tables<'messages'>,
    'id' | 'content' | 'sent_at' | 'sender_id' | 'receiver_id' | 'is_read'
>;

const MESSAGE_FIELDS = 'id, content, sent_at, sender_id, receiver_id, is_read';

/**
 * Danh sách hội thoại của một người: mỗi người đối thoại một dòng, kèm tin
 * nhắn cuối và số tin chưa đọc.
 *
 * Bảng `messages` không có khái niệm "cuộc hội thoại", nên phải gom theo cặp
 * người gửi/người nhận ở tầng ứng dụng.
 */
export async function getConversations(
    userId: string
): Promise<Conversation[]> {
    const { data: rows, error } = await supabase
        .from('messages')
        .select(MESSAGE_FIELDS)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .is('deleted_at', null)
        .order('sent_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error('Error loading conversations:', error);
        return [];
    }

    const byPartner = new Map<string, { last: ChatMessage; unread: number }>();

    (rows || []).forEach((row) => {
        const partnerId =
            row.sender_id === userId ? row.receiver_id : row.sender_id;
        if (!partnerId) return;

        const entry = byPartner.get(partnerId);
        const isUnreadForMe = row.receiver_id === userId && !row.is_read;

        if (!entry) {
            byPartner.set(partnerId, {
                last: row,
                unread: isUnreadForMe ? 1 : 0,
            });
        } else if (isUnreadForMe) {
            entry.unread += 1;
        }
    });

    const partnerIds = [...byPartner.keys()];
    if (partnerIds.length === 0) return [];

    const { data: infos } = await supabase
        .from('user_info')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', partnerIds)
        .is('deleted_at', null);

    const infoMap = new Map((infos || []).map((i) => [i.user_id, i]));

    return partnerIds
        .map((id) => {
            const info = infoMap.get(id);
            const entry = byPartner.get(id)!;
            if (!info) return null;
            return {
                partner: info,
                lastMessage: entry.last.content,
                lastAt: entry.last.sent_at,
                unread: entry.unread,
            };
        })
        .filter((c): c is Conversation => c !== null)
        .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}

/**
 * Toàn bộ tin nhắn giữa hai người, cũ trước mới sau.
 */
export async function getThread(
    userId: string,
    partnerId: string,
    limit = 200
): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_FIELDS)
        .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
        )
        .is('deleted_at', null)
        .order('sent_at', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error loading thread:', error);
        return [];
    }

    return data || [];
}

/**
 * Tổng số tin chưa đọc, dùng cho badge trên header.
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .is('deleted_at', null);

    if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
    }

    return count ?? 0;
}

export async function sendMessage(
    client: WriteClient,
    senderId: string,
    receiverId: string,
    content: string
): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> {
    const { data, error } = await client
        .from('messages')
        .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            is_read: false,
            sent_at: new Date().toISOString(),
        })
        .select(MESSAGE_FIELDS)
        .single();

    if (error || !data) {
        return {
            ok: false,
            error: error?.message ?? 'Không gửi được tin nhắn',
        };
    }

    return { ok: true, message: data };
}

/**
 * Đánh dấu mọi tin nhắn người kia gửi cho mình là đã đọc.
 */
export async function markThreadRead(
    client: WriteClient,
    userId: string,
    partnerId: string
): Promise<number> {
    const { data, error } = await client
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', partnerId)
        .eq('is_read', false)
        .is('deleted_at', null)
        .select('id');

    if (error) {
        console.error('Error marking thread read:', error);
        return 0;
    }

    return data?.length ?? 0;
}
