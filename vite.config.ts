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
  });
});
