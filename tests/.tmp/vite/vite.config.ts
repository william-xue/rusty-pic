import { defineConfig } from 'vite';
import { rustyPic } from '../../../src/vite-plugin/index.ts';
export default defineConfig({
  build: { outDir: 'dist' },
  plugins: [
    rustyPic({
      quality: 80,
      format: 'webp',
      transcode: true,
      verbose: true,
      dev: { enabled: false },
      build: { enabled: true }
    }),
  ]
});
