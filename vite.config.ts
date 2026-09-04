import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig(async () => {
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return { plugins: [vinext(), cloudflare({
    viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
    inspectorPort: false,
    config: { name: 'cronicas', main: './worker/index.ts', compatibility_date: '2026-05-15', compatibility_flags: ['nodejs_compat'], keep_vars: true, secrets: { required: ['SUPABASE_SECRET_KEY'] }, ai: { binding: 'AI' } },
  })] };
});
