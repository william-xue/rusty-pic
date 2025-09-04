# Rusty-Pic Vite 插件使用指南

## 安装

```bash
npm install @fe-fast/rusty-pic
# 或
pnpm add @fe-fast/rusty-pic
# 或
yarn add @fe-fast/rusty-pic
```

## 基本使用

### 1. 在 Vite 配置中添加插件

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    rustyPic({
      // 基本配置
      quality: 80,
      format: 'webp'
    })
  ]
});
```

### 2. 高级配置

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    rustyPic({
      // 文件匹配
      include: ['**/*.{png,jpg,jpeg,webp}'],
      exclude: ['**/node_modules/**'],

      // 压缩配置
      quality: 85,
      format: 'auto', // 'webp' | 'jpeg' | 'png' | 'avif' | 'auto'

      // 尺寸配置
      resize: {
        maxWidth: 1920,
        maxHeight: 1080,
        fit: 'inside'
      },

      // 优化配置
      optimize: {
        colors: true,
        progressive: true,
        lossless: false
      },

      // 输出配置
      outputDir: 'dist/assets',
      generateManifest: true,
      preserveOriginal: false,

      // 环境配置
      dev: {
        enabled: false, // 开发环境默认禁用
        quality: 60
      },

      build: {
        enabled: true,
        generateWebp: true,
        generateAvif: false
      },

      // 缓存配置
      cache: {
        enabled: true,
        dir: 'node_modules/.cache/rusty-pic'
      },

      // 日志配置
      verbose: true,
      logLevel: 'info' // 'silent' | 'error' | 'warn' | 'info' | 'debug'
    })
  ]
});
```

## 配置选项详解

### 文件匹配
- `include`: 要处理的文件模式（glob 格式）
- `exclude`: 要排除的文件模式（glob 格式）

### 压缩配置
- `quality`: 压缩质量 (0-100)
- `format`: 输出格式
  - `'auto'`: 自动选择最佳格式
  - `'webp'`: WebP 格式
  - `'jpeg'`: JPEG 格式
  - `'png'`: PNG 格式
  - `'avif'`: AVIF 格式

### 尺寸配置
- `resize.maxWidth`: 最大宽度
- `resize.maxHeight`: 最大高度
- `resize.fit`: 缩放模式
  - `'cover'`: 覆盖
  - `'contain'`: 包含
  - `'fill'`: 填充
  - `'inside'`: 内部适应
  - `'outside'`: 外部适应

### 优化配置
- `optimize.colors`: 颜色优化
- `optimize.progressive`: 渐进式编码
- `optimize.lossless`: 无损压缩

### 环境配置
- `dev.enabled`: 开发环境是否启用
- `dev.quality`: 开发环境压缩质量
- `build.enabled`: 生产环境是否启用
- `build.generateWebp`: 是否生成 WebP 版本
- `build.generateAvif`: 是否生成 AVIF 版本

## 使用场景

### 1. 自动图片压缩
插件会自动检测项目中的图片文件，并在构建时进行压缩优化。

### 2. 多格式输出
可以同时生成多种格式的图片，提供更好的浏览器兼容性。

### 3. 开发环境优化
在开发环境中可以使用较低的压缩质量，提高构建速度。

### 4. 缓存机制
内置缓存机制，避免重复压缩相同的图片。

## 性能优化建议

1. **开发环境**: 建议禁用或使用较低质量设置
2. **生产环境**: 使用高质量设置，启用多格式输出
3. **缓存**: 启用缓存可以显著提高重复构建的速度
4. **文件过滤**: 使用 `include` 和 `exclude` 精确控制处理范围

## 注意事项

1. 插件需要 WebAssembly 支持
2. 首次使用时会下载 WASM 模块
3. 大量图片处理可能会增加构建时间
4. 建议在 CI/CD 环境中启用缓存

## 故障排除

### 1. WASM 模块加载失败
确保网络连接正常，WASM 模块会在首次使用时自动下载。

### 2. 构建时间过长
- 启用缓存机制
- 调整 `include`/`exclude` 规则
- 在开发环境中禁用插件

### 3. 内存使用过高
- 减少并发处理的图片数量
- 使用较低的质量设置
- 启用渐进式处理

## 示例项目

查看完整的示例项目：[rusty-pic-examples](https://github.com/fe-fast/rusty-pic/tree/main/examples)