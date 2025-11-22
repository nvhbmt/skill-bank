export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, redirect }) => {
    try {
        const redirectTo = url.searchParams.get('redirect_to') || url.origin;
        const lang = url.searchParams.get('lang') || 'vi';
        const signInUrl = `${redirectTo}/${lang}/sign-in`;
        console.log('Google OAuth redirectTo', signInUrl);
        // Get the OAuth URL for Google
        // Redirect to sign-in page which will handle hash fragment
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: signInUrl,
            },
        });

        if (error) {
            console.error('Google OAuth error:', error);
            return redirect(`${redirectTo}/sign-in?error=oauth_failed`, 302);
        }

        if (data?.url) {
            return redirect(data.url, 302);
        }

        return redirect(`${redirectTo}/sign-in?error=oauth_failed`, 302);
    } catch (error) {
        console.error('Error initiating Google OAuth:', error);
        return redirect(`${url.origin}/sign-in?error=oauth_failed`, 302);
    }
};

