export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const GET: APIRoute = async ({ url, redirect, request }) => {
    try {
        // Get redirect parameters - prefer redirect_to from query, fallback to request origin
        const redirectToParam = url.searchParams.get('redirect_to');
        // Use request.headers to get the actual host in production
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || url.protocol.slice(0, -1) || 'https';
        const fallbackOrigin = redirectToParam || (host ? `${protocol}://${host}` : url.origin);
        const redirectTo = redirectToParam || fallbackOrigin;
        
        const lang = url.searchParams.get('lang') || 'vi';
        const page = url.searchParams.get('page') || 'sign-in'; // 'sign-in' or 'sign-up'
        
        // Build the correct redirect URL based on the page
        const callbackUrl = `${redirectTo}/${lang}/${page}`;
        console.log('Facebook OAuth - redirectTo:', redirectTo, 'callbackUrl:', callbackUrl);
        
        // Get the OAuth URL for Facebook
        // Redirect to the correct page (sign-in or sign-up) which will handle hash fragment
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: callbackUrl,
            },
        });

        if (error) {
            console.error('Facebook OAuth error:', error);
            return redirect(`${redirectTo}/${lang}/${page}?error=oauth_failed`, 302);
        }

        if (data?.url) {
            return redirect(data.url, 302);
        }

        return redirect(`${redirectTo}/${lang}/${page}?error=oauth_failed`, 302);
    } catch (error) {
        console.error('Error initiating Facebook OAuth:', error);
        const lang = url.searchParams.get('lang') || 'vi';
        const page = url.searchParams.get('page') || 'sign-in';
        return redirect(`${url.origin}/${lang}/${page}?error=oauth_failed`, 302);
    }
};
