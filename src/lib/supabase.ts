import type { Database } from '@/types/database.types';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY
);

/**
 * Create an authenticated Supabase client using a session
 * For server-side API routes, we use the access token in headers
 */
export function createAuthenticatedClient(session: Session) {
    return createClient<Database>(
        import.meta.env.SUPABASE_URL,
        import.meta.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            },
        }
    );
}
