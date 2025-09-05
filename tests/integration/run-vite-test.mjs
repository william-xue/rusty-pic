#!/usr/bin/env node

import { mkdir, rm, writeFile, readFile, cp, readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '../../');
const tmpRoot = path.join(root, 'tests/.tmp/vite');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', cwd: opts.cwd || process.cwd(), env: process.env });
    p.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function ensureCleanDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function findFiles(dir, predicate) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await findFiles(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

(async () => {
  console.log('🧪 Running Vite integration test for rusty-pic...');

  await ensureCleanDir(tmpRoot);
  const srcDir = path.join(tmpRoot, 'src');
  const assetsDir = path.join(srcDir, 'assets');
  await mkdir(assetsDir, { recursive: true });

  // Copy sample image from repo public into fixture
  const sampleSrc = path.join(root, 'public/卡片.png');
  const sampleDst = path.join(assetsDir, 'sample.png');
  await cp(sampleSrc, sampleDst);

  // Write minimal index.html and entry that imports the image
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>`;
  await writeFile(path.join(tmpRoot, 'index.html'), html, 'utf8');

  const mainTs = `import url from './assets/sample.png';
const img = new Image();
img.src = url;
document.body.appendChild(img);
console.log('image url', url);
`;
  await writeFile(path.join(srcDir, 'main.ts'), mainTs, 'utf8');

  // Vite config that imports plugin from source
  const viteConfigTs = `import { defineConfig } from 'vite';
import { rustyPic } from '${path.relative(tmpRoot, path.join(root, 'src/vite-plugin/index.ts')).replace(/\\/g, '/')}';
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
`;
  await writeFile(path.join(tmpRoot, 'vite.config.ts'), viteConfigTs, 'utf8');

  const origStat = await stat(sampleDst);

  // Run vite build using local vite binary
  const viteBin = path.join(root, 'node_modules/.bin/vite');
  await run(viteBin, ['build', '--config', path.join(tmpRoot, 'vite.config.ts'), '--outDir', path.join(tmpRoot, 'dist')], { cwd: tmpRoot });

  // Find output png assets
  const assets = await findFiles(path.join(tmpRoot, 'dist'), (f) => /\.png$/i.test(f));
  if (assets.length === 0) {
    console.warn('⚠️ No PNG assets found in Vite output.');
  }

  // Report sizes
  console.log('Original file:', sampleDst, `${(origStat.size/1024/1024).toFixed(2)} MB`);
  for (const f of assets) {
    const s = await stat(f);
    console.log('Built asset:', f, `${(s.size/1024/1024).toFixed(2)} MB`, `change: ${(((origStat.size - s.size)/origStat.size)*100).toFixed(1)}%`);
  }

  console.log('✅ Vite integration test finished. Inspect logs above for compression results.');
})();
