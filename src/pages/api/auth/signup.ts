export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();

    if (!email || !password || !username) {
        return new Response('Email, username and password are required', {
            status: 400,
        });
    }
    const { error, data } = await supabase.auth.signUp({
        email,
        password,
    });

    await supabase
        .from('profiles')
        .insert({ username, id: data.user?.id, roles: ['user'], email });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    if (!data.session) {
        return new Response('Session not found', { status: 500 });
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
