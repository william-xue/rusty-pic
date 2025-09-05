# Rusty-Pic

High-performance image optimization toolkit for the web. Rusty-Pic integrates seamlessly with Vite and Webpack, compresses images at build time with content-hashed outputs and auto-updated references, and supports optional cross-format transcode (e.g. PNG → WebP/AVIF).

Rusty-Pic 是一款高性能图片优化工具，深度集成 Vite 与 Webpack。它在构建阶段直接替换打包资产的字节，自动生成带内容哈希的产物并重写所有引用，可选开启跨格式转码（例如 PNG → WebP/AVIF）。

---

## ✨ Features | 功能特性

- Build-pipeline native integration (Vite + Webpack): auto content hash + auto reference rewrite
- Optional cross-format transcode: PNG/JPEG → WebP/AVIF, safe rename & reference updates
- Real compression in Node builds (sharp), WASM path for browsers (with Canvas fallback)
- Cache-aware and size-aware: only replace when smaller; cache to avoid repeated work
- Simple DX: one plugin, minimal config; integration tests provided

- 原生构建管线集成（Vite + Webpack）：自动内容哈希与引用重写
- 跨格式转码可选：PNG/JPEG → WebP/AVIF，安全改名与全量引用替换
- Node 构建期真实压缩（sharp），浏览器端支持 WASM（并带 Canvas 兜底）
- 感知缓存与体积：仅在更小时替换，缓存避免重复压缩
- 开发者体验友好：一套插件，最小配置；提供可运行的集成测试

---

## 📦 Install | 安装

```bash
# npm
npm install @fe-fast/rusty-pic
# pnpm
pnpm add @fe-fast/rusty-pic
# yarn
yarn add @fe-fast/rusty-pic
```

---

## ⚙️ Vite Usage | Vite 使用

Default behavior: format='auto', transcode=false → keep original extensions (png stays png) and compress; references are auto-rewritten to hashed outputs.

默认行为：format='auto' 且 transcode=false → 保持原扩展名，仅同格式压缩；引用会自动重写到带哈希的产物。

Enable WebP transcode:
```ts path=null start=null
import { defineConfig } from 'vite';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    rustyPic({
      format: 'webp',      // target format
      transcode: true,     // allow cross-format rename
      quality: 80,         // 1-100
      // optional
      resize: { maxWidth: 1920, maxHeight: 1080, fit: 'inside' },
      cache: { enabled: true },
      dev: { enabled: false },
      build: { enabled: true },
      verbose: true
    })
  ]
});
```

Enable AVIF transcode:
```ts path=null start=null
rustyPic({ format: 'avif', transcode: true, quality: 70 })
```

---

## 🔧 Webpack Usage | Webpack 使用

Add the plugin and ensure images are treated as assets:
```js path=null start=null
import RustyPicWebpackPlugin from '@fe-fast/rusty-pic/webpack';

export default {
  mode: 'production',
  module: {
    rules: [
      { test: /\.(png|jpe?g|webp|avif)$/i, type: 'asset/resource' }
    ]
  },
  output: {
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]'
  },
  plugins: [
    new RustyPicWebpackPlugin({
      // default keeps original ext (no transcode)
      // set webp/avif to transcode and auto-rewrite references
      format: 'webp',
      quality: 80,
      verbose: true
    })
  ]
};
```

Notes | 说明：
- Webpack 分支下，设置 format!='auto' 即表示允许跨格式转码（例如 'webp'/'avif'）。插件会安全地改名并替换文本资产中的引用。
- 若你只想同格式压缩但不改扩展名，设置 format:'auto' 即可。

---

## 🧠 Defaults & Options | 默认与选项

- format: 'auto'（默认） → 同扩展名压缩；不变更后缀
- transcode: false（默认） → 仅当设为 true 并 format≠原扩展名时才跨格式
- quality: 80（默认）
- resize: { maxWidth?, maxHeight?, fit? }（Vite/Webpack 同）
- cache.enabled: true（默认）
- dev.enabled: false（默认）
- build.enabled: true（默认）

---

## 🛠️ Runtime Backends | 运行后端

- Node builds: sharp is used to perform real compression (jpeg/webp/avif/png). This ensures stable, fast build-time optimization and large size reductions.
- Browser/WASM: the library exposes a WASM path (with Canvas fallback) for browser-side usage; this is independent from the build pipeline integration.

- Node 构建：采用 sharp 实现真实压缩，稳定高效，体积下降显著。
- 浏览器/WASM：库在浏览器侧可走 WASM（带 Canvas 兜底），与构建期集成相互独立。

---

## 🧪 Integration Tests | 集成测试

We ship runnable integration tests (generated into tests/.tmp) to verify both pipelines:
- Vite: `pnpm run test:int:vite`
- Webpack: `pnpm run test:int:webpack`

项目内提供可运行的集成测试（生成到 tests/.tmp）以验证两套管线：
- Vite：`pnpm run test:int:vite`
- Webpack：`pnpm run test:int:webpack`

---

## 📚 Programmatic API | 编程接口

Compress a single file (browser example):
```ts path=null start=null
import { rustyPic } from '@fe-fast/rusty-pic';
const file = document.querySelector('input[type="file"]').files[0];
const result = await rustyPic.compress(file, { format: 'webp', quality: 80 });
console.log('ratio', result.compressionRatio.toFixed(1), '%');
```

Batch compress:
```ts path=null start=null
const files = Array.from(document.querySelector('input[type="file"]').files);
const results = await rustyPic.compressBatch(files, { format: 'auto', quality: 85 }, (p) => {
  console.log(`progress ${p.completed}/${p.total}`);
});
```

Smart compress:
```ts path=null start=null
const r1 = await rustyPic.smartCompress(file);        // auto params
const r2 = await rustyPic.smartCompress(file, 100e3); // target 100 KB
```

Type signatures (simplified):
```ts path=null start=null
interface CompressionOptions {
  format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';
  quality?: number; // 1-100
  resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' };
  optimize?: { colors?: boolean; progressive?: boolean; lossless?: boolean };
}
```

---

## 🧰 CLI (optional) | 可选 CLI

```bash
npm install -g @fe-fast/rusty-pic
rusty-pic compress input.jpg -q 80 -f webp
```

> CLI 为扩展能力，推荐优先采用 Vite/Webpack 构建集成以获得自动哈希与引用重写。

---

## ❓ FAQ

- Q: Will hashed filenames and references be correct after compression/transcode?
  - A: Yes. The plugins operate within the bundler pipeline. Final filenames are content-hashed after compression, and references in JS/CSS/HTML are auto-updated.
- Q: Is WebP/AVIF default?
  - A: No. Default is format='auto' and transcode=false (no rename). Enable transcode + set target format to produce WebP/AVIF.
- Q: Any browser compatibility notes for AVIF?
  - A: AVIF requires modern browsers. Consider <picture> with multiple sources or server-side negotiation for older browsers.

---

## 🏗️ Development | 开发

```bash
pnpm install
pnpm run dev
pnpm run build
```

### Requirements | 环境
- Node.js 18+
- (for WASM dev) Rust 1.70+ and wasm-pack

---

## 📄 License | 许可证

MIT

---

If this project helps you, please consider giving it a ⭐.
如果这个项目对你有帮助，欢迎点亮一个 ⭐！
