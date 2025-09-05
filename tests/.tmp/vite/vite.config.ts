import { defineConfig } from 'vite';
import { rustyPic } from '../../../src/vite-plugin/index.ts';
export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    rustyPic({
      quality: 80,
      format: 'auto',
      verbose: true,
      dev: { enabled: false },
      build: { enabled: true }
    }),
  ]
});
