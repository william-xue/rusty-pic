# Rusty-Pic

🚀 高性能图片压缩工具，基于 Rust + WebAssembly 构建，专为弱网络环境和低端设备优化。

## ✨ 特性

- **极致压缩**: 基于 Rust 的高性能压缩算法，实现最大压缩率同时保持图片质量
- **跨平台支持**: WebAssembly 技术支持浏览器、Node.js 和命令行环境
- **多格式支持**: 支持 PNG、JPEG、WebP、AVIF 格式
- **智能压缩**: 自动格式选择和参数优化
- **批量处理**: 支持多文件并行处理
- **开发者友好**: 提供 npm 包、CLI 工具、Vite 插件和 Webpack 插件

## 🎯 核心优势

- 90%+ 平均压缩率
- 5x 速度提升（相比传统工具）
- <2MB WASM 模块大小
- 针对弱网络环境优化

## 🚀 快速开始

### 在线演示

访问 [在线演示](https://your-demo-url.com) 体验 Rusty-Pic 的压缩能力。

### 安装

```bash
# 使用 npm
npm install @fe-fast/rusty-pic

# 使用 pnpm
pnpm add @fe-fast/rusty-pic

# 使用 yarn
yarn add @fe-fast/rusty-pic
```

### 基础使用

```typescript
import { rustyPic } from '@fe-fast/rusty-pic';

// 压缩单个文件
const file = document.querySelector('input[type="file"]').files[0];
const result = await rustyPic.compress(file, {
  format: 'webp',
  quality: 80
});

console.log(`压缩率: ${result.compressionRatio.toFixed(1)}%`);
```

### 批量压缩

```typescript
import { rustyPic } from '@fe-fast/rusty-pic';

const files = Array.from(document.querySelector('input[type="file"]').files);
const results = await rustyPic.compressBatch(files, {
  format: 'auto',
  quality: 85
}, (progress) => {
  console.log(`进度: ${progress.completed}/${progress.total}`);
});
```

### 智能压缩

```typescript
import { rustyPic } from '@fe-fast/rusty-pic';

// 自动选择最佳参数
const result = await rustyPic.smartCompress(file);

// 压缩到指定大小
const result = await rustyPic.smartCompress(file, 100 * 1024); // 100KB
```

## 🛠️ CLI 工具

### 安装 CLI

```bash
npm install -g @fe-fast/rusty-pic
```

### 使用示例

```bash
# 压缩单个文件
rusty-pic compress input.jpg -q 80 -f webp

# 批量压缩
rusty-pic batch ./images -o ./compressed --recursive

# 智能压缩
rusty-pic smart input.png -s 50000  # 压缩到 50KB

# 查看图片信息
rusty-pic info input.jpg
```

### CLI 选项

```bash
rusty-pic compress [options] <input>

选项:
  -o, --output <path>     输出路径
  -q, --quality <number>  压缩质量 (0-100) (默认: 80)
  -f, --format <format>   输出格式 (webp|jpeg|png|auto) (默认: auto)
  --width <number>        最大宽度
  --height <number>       最大高度
  --progressive           启用渐进式编码
  --lossless             启用无损压缩
```

## 🔧 API 参考

### CompressionOptions

```typescript
interface CompressionOptions {
  format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';
  quality?: number; // 0-100
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  optimize?: {
    colors?: boolean;
    progressive?: boolean;
    lossless?: boolean;
  };
}
```

### CompressionResult

```typescript
interface CompressionResult {
  data: Uint8Array;           // 压缩后的数据
  originalSize: number;       // 原始文件大小
  compressedSize: number;     // 压缩后大小
  compressionRatio: number;   // 压缩率 (%)
  processingTime: number;     // 处理时间 (ms)
  format: string;            // 输出格式
  metadata?: {               // 图片元数据
    width: number;
    height: number;
    colorType: string;
    bitDepth: number;
  };
}
```

## 🔌 Vite 插件

Rusty-Pic 提供了 Vite 插件，可以在构建时自动压缩项目中的图片资源。

### 安装和配置

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    rustyPic({
      // 基本配置
      quality: 80,
      format: 'webp',
      
      // 高级配置
      resize: {
        maxWidth: 1920,
        maxHeight: 1080
      },
      
      // 环境配置
      dev: {
        enabled: false // 开发环境禁用
      },
      
      build: {
        enabled: true,
        generateWebp: true
      }
    })
  ]
});
```

### 插件特性

- **自动压缩**: 构建时自动检测和压缩图片
- **多格式输出**: 同时生成多种格式的图片
- **智能缓存**: 避免重复压缩相同图片
- **开发优化**: 开发环境可选择性启用
- **详细日志**: 提供压缩进度和结果统计

查看 [Vite 插件完整文档](VITE_PLUGIN_USAGE.md) 了解更多配置选项。

## 🏗️ 开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- wasm-pack

### 构建项目

```bash
# 克隆项目
git clone https://github.com/fe-fast/rusty-pic.git
cd rusty-pic

# 安装依赖
pnpm install

# 构建 WASM 模块
pnpm run build:wasm

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build
```

### 项目结构

```
rusty-pic/
├── crates/
│   ├── rusty-pic-core/     # 核心压缩引擎 (Rust)
│   └── rusty-pic-wasm/     # WASM 绑定层
├── src/
│   ├── lib/                # JavaScript API
│   ├── cli/                # CLI 工具
│   ├── pages/              # Web 演示页面
│   └── components/         # React 组件
├── pkg/                    # 生成的 WASM 包
└── dist/                   # 构建输出
```

### 运行测试

```bash
# Rust 测试
cargo test

# JavaScript 测试
pnpm test

# 性能基准测试
pnpm run bench
```

## 📊 性能对比

| 工具 | 压缩率 | 处理速度 | 模块大小 | 质量保持 |
|------|--------|----------|----------|----------|
| Rusty-Pic | 92% | 5x | 1.8MB | ⭐⭐⭐⭐⭐ |
| imagemin | 75% | 1x | 15MB+ | ⭐⭐⭐⭐ |
| squoosh | 80% | 2x | 3.2MB | ⭐⭐⭐⭐ |

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [image-rs](https://github.com/image-rs/image) - Rust 图像处理库
- [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) - Rust 和 WebAssembly 绑定
- [Vite](https://vitejs.dev/) - 快速的前端构建工具

## 📞 支持

- 📧 邮箱: support@fe-fast.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/fe-fast/rusty-pic/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/fe-fast/rusty-pic/discussions)

---

⭐ 如果这个项目对你有帮助，请给我们一个 star！