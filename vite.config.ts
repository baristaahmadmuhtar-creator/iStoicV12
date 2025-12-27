import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, (process as any).cwd(), '');
    
    const processEnv: Record<string, string> = {};
    
    // Explicitly include keys needed for the app
    // Note: VITE_ keys are included by default, but we manually map non-VITE keys if they exist in system env (Vercel)
    const keysToExpose = [
        'API_KEY', // Fallback
        'GOOGLE_API_KEY',
    ];

    // 1. Load VITE_ keys automatically
    Object.keys(env).forEach(key => {
        if (key.startsWith('VITE_')) {
            processEnv[key] = env[key];
        }
    });

    // 2. Load specific whitelisted keys
    keysToExpose.forEach(key => {
        if (env[key]) processEnv[key] = env[key];
    });

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env': JSON.stringify(processEnv)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'framer-motion'],
                    icons: ['lucide-react'],
                    ai: ['@google/genai', 'openai', 'groq-sdk']
                }
            }
        }
      }
    };
});