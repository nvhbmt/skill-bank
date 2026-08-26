import type { Database } from '@/types/database.types';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

/**
 * Client dùng chung cho các truy vấn đọc ẩn danh.
 *
 * BẮT BUỘC tắt persistSession/autoRefreshToken: đây là singleton sống suốt
 * vòng đời tiến trình server, nếu một route gọi `signInWithPassword` trên nó
 * thì phiên đăng nhập của người đó dính lại và mọi request sau đó của MỌI
 * người dùng sẽ chạy dưới danh nghĩa người đó. Các thao tác xác thực phải
 * dùng `createAnonClient()` để có client riêng cho từng request.
 */
export const supabase = createClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);

/**
 * Tạo client ẩn danh mới cho từng request. Dùng cho mọi thao tác `auth.*`
 * (đăng nhập, đăng ký, xác thực OTP, OAuth) để không làm bẩn client dùng chung.
 */
export function createAnonClient() {
    return createClient<Database>(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

/**
 * Create an authenticated Supabase client using a session
 * For server-side API routes, we use the access token in headers
 */
export function createAuthenticatedClient(session: Session) {
    const supabase = createClient<Database>(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false,
            },
        }
    );

    supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
    });

    return supabase;
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * WARNING: Only use this on the server-side for admin operations
 */
export function createServiceRoleClient() {
    const serviceRoleKey =
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
        import.meta.env.SUPABASE_ANON_KEY;

    return createClient<Database>(
        import.meta.env.SUPABASE_URL,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}
