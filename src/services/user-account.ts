import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type Client = SupabaseClient<Database>;

/**
 * Chuẩn hoá chuỗi thành username hợp lệ (chữ và số, bắt đầu bằng chữ).
 */
function slugifyUsername(raw: string): string {
    const base = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // bỏ dấu thanh
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (!base) return '';
    // Schema yêu cầu username không bắt đầu bằng số
    return /^[a-z]/.test(base) ? base.slice(0, 20) : `u${base}`.slice(0, 20);
}

/**
 * Tìm username còn trống, thêm hậu tố số nếu bị trùng.
 * user_info.username là UNIQUE nên nếu không kiểm tra thì insert sẽ lỗi và
 * người dùng bị kẹt lại không có bản ghi user_info.
 */
async function findAvailableUsername(
    client: Client,
    preferred: string,
    fallbackSeed: string
): Promise<string> {
    const base =
        slugifyUsername(preferred) || `user${fallbackSeed.slice(0, 8)}`;

    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = attempt === 0 ? base : `${base}${attempt}`;
        const { data } = await client
            .from('user_info')
            .select('user_id')
            .eq('username', candidate)
            .maybeSingle();

        if (!data) return candidate;
    }

    return `user${fallbackSeed.replace(/-/g, '').slice(0, 12)}`;
}

/**
 * Đảm bảo người dùng có bản ghi trong `user_info`.
 *
 * Toàn bộ ứng dụng tra cứu qua bảng này (đăng nhập bằng username, kiểm tra
 * vai trò admin, trang hồ sơ...), nên thiếu bản ghi là tài khoản không dùng
 * được. Phải truyền client đã đăng nhập: ghi bằng client ẩn danh sẽ bị RLS
 * chặn nhưng PostgREST không báo lỗi.
 */
export async function ensureUserInfo(
    client: Client,
    user: User
): Promise<{ ok: boolean; username?: string; error?: string }> {
    if (!user.email) {
        return { ok: false, error: 'Tài khoản không có email' };
    }

    const { data: existing } = await client
        .from('user_info')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

    if (existing) {
        return { ok: true, username: existing.username };
    }

    const metadata = user.user_metadata ?? {};
    const preferred =
        metadata.username ||
        metadata.full_name ||
        metadata.name ||
        user.email.split('@')[0];

    const username = await findAvailableUsername(client, preferred, user.id);

    const { data: inserted, error } = await client
        .from('user_info')
        .insert({
            user_id: user.id,
            email: user.email,
            username,
            full_name: metadata.full_name || metadata.name || username,
            avatar_url: metadata.avatar_url || null,
            role: 'user',
        })
        .select('username')
        .single();

    if (error || !inserted) {
        console.error('Error creating user_info:', error);
        return { ok: false, error: error?.message || 'Không tạo được hồ sơ' };
    }

    return { ok: true, username: inserted.username };
}
