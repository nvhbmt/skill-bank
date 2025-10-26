export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();

    if (!username || !password) {
        return new Response('Username and password are required', {
            status: 400,
        });
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

    if (profileError || !profile) throw new Error('Không tìm thấy username');
    const email = profile?.email;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    const { access_token, refresh_token } = data.session;
    cookies.set('sb-access-token', access_token, {
        path: '/',
    });
    cookies.set('sb-refresh-token', refresh_token, {
        path: '/',
    });
    return redirect('/dashboard');
};
