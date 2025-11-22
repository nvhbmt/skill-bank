export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, redirect }) => {
    try {
        const redirectTo = url.searchParams.get('redirect_to') || url.origin;
        console.log('redirectTo', `${redirectTo}/api/auth/callback`);
        // Get the OAuth URL for Facebook
        // Use callback-handler page to handle hash fragment
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: `${redirectTo}/auth/callback-handler`,
            },
        });

        if (error) {
            console.error('Facebook OAuth error:', error);
            return redirect(`${redirectTo}/sign-in?error=oauth_failed`, 302);
        }

        if (data?.url) {
            return redirect(data.url, 302);
        }

        return redirect(`${redirectTo}/sign-in?error=oauth_failed`, 302);
    } catch (error) {
        console.error('Error initiating Facebook OAuth:', error);
        return redirect(`${url.origin}/sign-in?error=oauth_failed`, 302);
    }
};
