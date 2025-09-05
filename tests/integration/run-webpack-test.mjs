#!/usr/bin/env node

import { mkdir, rm, writeFile, cp, readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '../../');
const tmpRoot = path.join(root, 'tests/.tmp/webpack');

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
  console.log('🧪 Running Webpack integration test for rusty-pic...');

  await ensureCleanDir(tmpRoot);
  const srcDir = path.join(tmpRoot, 'src');
  const assetsDir = path.join(srcDir, 'assets');
  await mkdir(assetsDir, { recursive: true });

  const sampleSrc = path.join(root, 'public/卡片.png');
  const sampleDst = path.join(assetsDir, 'sample.png');
  await cp(sampleSrc, sampleDst);

  const indexJs = `import imgUrl from './assets/sample.png';
console.log('image url', imgUrl);
`;
  await writeFile(path.join(srcDir, 'index.js'), indexJs, 'utf8');

  const webpackConfigJs = `import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _rp = require('${path.relative(tmpRoot, path.join(root, 'src/vite-plugin/webpack.js')).replace(/\\/g, '/')}');
const RustyPicWebpackPlugin = _rp.default || _rp;

export default {
  mode: 'production',
  entry: path.resolve('${path.join(tmpRoot, 'src/index.js').replace(/\\/g, '/')}'),
  output: {
    path: path.resolve('${path.join(tmpRoot, 'dist').replace(/\\/g, '/')}'),
    filename: 'bundle.js',
    clean: true,
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]'
  },
  module: {
    rules: [
      { test: /\\.(png|jpe?g|webp|avif)$/i, type: 'asset/resource' }
    ]
  },
  plugins: [
    new RustyPicWebpackPlugin({
      quality: 80,
      format: 'auto',
      verbose: true
    })
  ]
};
`;
  await writeFile(path.join(tmpRoot, 'webpack.config.mjs'), webpackConfigJs, 'utf8');

  const origStat = await stat(sampleDst);

  // Run webpack using local binary
  const webpackBin = path.join(root, 'node_modules/.bin/webpack');
  await run(webpackBin, ['--config', path.join(tmpRoot, 'webpack.config.mjs')], { cwd: tmpRoot });

  // Find output png assets
  const assets = await findFiles(path.join(tmpRoot, 'dist'), (f) => /\.png$/i.test(f));
  if (assets.length === 0) {
    console.warn('⚠️ No PNG assets found in Webpack output.');
  }

  console.log('Original file:', sampleDst, `${(origStat.size/1024/1024).toFixed(2)} MB`);
  for (const f of assets) {
    const s = await stat(f);
    console.log('Built asset:', f, `${(s.size/1024/1024).toFixed(2)} MB`, `change: ${(((origStat.size - s.size)/origStat.size)*100).toFixed(1)}%`);
  }

  console.log('✅ Webpack integration test finished. Inspect logs above for compression results.');
})();
