/// <reference types="astro/client" />
import type { Session } from '@supabase/supabase-js';

declare global {
    namespace App {
        interface Locals {
            session: Session | null;
        }
    }

    interface ImportMetaEnv {
        readonly SUPABASE_URL: string;
        readonly SUPABASE_ANON_KEY: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}
