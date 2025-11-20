// @ts-check
import { defineConfig } from 'astro/config';
import path from 'path';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
    vite: {
        resolve: {
            alias: {
                '@': path.resolve('./src'),
            },
        },
    },
    output: 'server',
    adapter: vercel(),
});
