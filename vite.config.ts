import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return defineConfig({
    plugins: [react()],
    base: mode === 'production' ? './' : env.VITE_SERVER_BASE,
    server: {
      host: '0.0.0.0',
    },
    build: {
      // Disable ES modules to avoid MIME type issues on Azure Static Web Apps
      target: 'es2015',
      rollupOptions: {
        output: {
          format: 'iife',
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    }
  });
});
