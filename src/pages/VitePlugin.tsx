import { useState } from "react";
import { Puzzle, Copy, Check, Download, Settings, Zap, Package } from "lucide-react";
import { toast } from "sonner";

const installExample = `# 安装 Rusty-Pic (包含 Vite 插件)
npm install @fe-fast/rusty-pic --save-dev
# 或者
pnpm add -D @fe-fast/rusty-pic
# 或者
yarn add -D @fe-fast/rusty-pic`;

const basicConfigExample = `// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    react(),
    rustyPic({
      // 基础配置
      quality: 80,
      format: 'auto'
    })
  ]
});`;

const advancedConfigExample = `// vite.config.js
import { defineConfig } from 'vite';
import { rustyPic } from '@fe-fast/rusty-pic/vite';

export default defineConfig({
  plugins: [
    rustyPic({
      // 输入目录配置
      include: ['src/assets/**/*.{png,jpg,jpeg,webp}'],
      exclude: ['**/icons/**', '**/*.svg'],
      
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
      
      // 开发模式配置
      dev: {
        enabled: false, // 开发时不压缩
        quality: 60 // 开发时使用较低质量
      },
      
      // 生产模式配置
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
});`;

const nextjsExample = `// next.config.js
const { withRustyPic } = require('@fe-fast/rusty-pic/next');

module.exports = withRustyPic({
  // Next.js 配置
  reactStrictMode: true,
  
  // Rusty-Pic 配置
  rustyPic: {
    quality: 80,
    format: 'webp',
    include: ['public/**/*.{png,jpg,jpeg}'],
    outputDir: 'public/optimized'
  }
});`;

const webpackExample = `// webpack.config.js
const RustyPicWebpackPlugin = require('@fe-fast/rusty-pic/webpack');

module.exports = {
  plugins: [
    new RustyPicWebpackPlugin({
      quality: 75,
      format: 'auto',
      include: /\.(png|jpe?g|webp)$/i,
      exclude: /node_modules/
    })
  ]
};`;

const manifestExample = `{
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "files": {
    "src/assets/hero.jpg": {
      "original": {
        "path": "src/assets/hero.jpg",
        "size": 2048576,
        "format": "jpeg"
      },
      "compressed": {
        "path": "dist/assets/hero-abc123.webp",
        "size": 204857,
        "format": "webp",
        "compressionRatio": 90.0,
        "processingTime": 1250
      }
    },
    "src/assets/gallery/image1.png": {
      "original": {
        "path": "src/assets/gallery/image1.png",
        "size": 1536000,
        "format": "png"
      },
      "compressed": {
        "path": "dist/assets/gallery/image1-def456.webp",
        "size": 153600,
        "format": "webp",
        "compressionRatio": 90.0,
        "processingTime": 980
      }
    }
  },
  "summary": {
    "totalFiles": 2,
    "originalSize": 3584576,
    "compressedSize": 358457,
    "totalSavings": 3226119,
    "averageCompressionRatio": 90.0,
    "totalProcessingTime": 2230
  }
}`;

const configOptions = [
  {
    option: "include",
    type: "string[] | string",
    default: "['**/*.{png,jpg,jpeg,webp}']",
    description: "要处理的文件模式"
  },
  {
    option: "exclude",
    type: "string[] | string",
    default: "[]",
    description: "要排除的文件模式"
  },
  {
    option: "quality",
    type: "number",
    default: "80",
    description: "压缩质量 (1-100)"
  },
  {
    option: "format",
    type: "'webp' | 'jpeg' | 'png' | 'avif' | 'auto'",
    default: "'auto'",
    description: "输出格式"
  },
  {
    option: "resize.maxWidth",
    type: "number",
    default: "undefined",
    description: "最大宽度限制"
  },
  {
    option: "resize.maxHeight",
    type: "number",
    default: "undefined",
    description: "最大高度限制"
  },
  {
    option: "optimize.colors",
    type: "boolean",
    default: "true",
    description: "启用颜色优化"
  },
  {
    option: "optimize.progressive",
    type: "boolean",
    default: "false",
    description: "启用渐进式编码"
  },
  {
    option: "generateManifest",
    type: "boolean",
    default: "false",
    description: "生成压缩清单文件"
  },
  {
    option: "verbose",
    type: "boolean",
    default: "false",
    description: "显示详细日志"
  }
];

export default function VitePlugin() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success('代码已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const CodeBlock = ({ code, title, language = "javascript" }: { code: string; title: string; language?: string }) => (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
        <span className="text-sm font-medium text-slate-300">{title}</span>
        <button
          onClick={() => copyToClipboard(code)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="复制代码"
        >
          {copiedCode === code ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <pre className="p-4 text-sm text-slate-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="font-medium">✅ 可用</span>
            <span className="ml-2 text-sm">Vite 插件已包含在 @fe-fast/rusty-pic 包中！</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Puzzle className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          Vite 插件
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          无缝集成到 Vite 构建流程，自动压缩图片资源，支持开发和生产环境的不同配置。
        </p>
      </div>

      {/* Installation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Package className="w-6 h-6 mr-2 text-blue-500" />
          安装
        </h2>
        <CodeBlock code={installExample} title="包管理器安装" language="bash" />
      </section>

      {/* Basic Configuration */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-green-500" />
          基础配置
        </h2>
        <CodeBlock code={basicConfigExample} title="基础 Vite 配置" />
      </section>

      {/* Advanced Configuration */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-purple-500" />
          高级配置
        </h2>
        <CodeBlock code={advancedConfigExample} title="完整配置选项" />
      </section>

      {/* Framework Integration */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          其他框架集成
        </h2>
        <div className="space-y-6">
          <CodeBlock code={nextjsExample} title="Next.js 集成" />
          <CodeBlock code={webpackExample} title="Webpack 集成" />
        </div>
      </section>

      {/* Configuration Options */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          配置选项参考
        </h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    选项
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    默认值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    说明
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {configOptions.map((option, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {option.option}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {option.type}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        {option.default}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {option.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Manifest File */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          压缩清单文件
        </h2>
        <p className="text-slate-600 mb-4">
          启用 <code className="bg-slate-100 px-2 py-1 rounded text-sm">generateManifest: true</code> 后，
          插件会生成详细的压缩报告文件 <code className="bg-slate-100 px-2 py-1 rounded text-sm">rusty-pic-manifest.json</code>：
        </p>
        <CodeBlock code={manifestExample} title="压缩清单示例" language="json" />
      </section>

      {/* Build Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          构建流程说明
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              🔄 开发模式 (dev)
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 默认禁用压缩，保证开发速度</li>
              <li>• 可配置低质量压缩用于预览</li>
              <li>• 支持热更新，文件变化时重新处理</li>
              <li>• 生成临时文件，不影响源文件</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              🚀 生产模式 (build)
            </h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li>• 启用完整压缩，优化文件大小</li>
              <li>• 生成多种格式 (WebP, AVIF)</li>
              <li>• 自动更新资源引用路径</li>
              <li>• 生成压缩报告和清单文件</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Performance Tips */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          性能优化建议
        </h2>
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">
              ⚡ 构建性能优化
            </h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>• 启用缓存: <code className="bg-yellow-100 px-1 rounded">cache.enabled: true</code></li>
              <li>• 合理设置 include/exclude 模式，避免处理不必要的文件</li>
              <li>• 大项目建议使用 <code className="bg-yellow-100 px-1 rounded">verbose: false</code> 减少日志输出</li>
              <li>• CI/CD 环境可以预先缓存 node_modules/.cache/rusty-pic</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              🎯 输出优化
            </h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• 使用 <code className="bg-purple-100 px-1 rounded">format: 'auto'</code> 让插件自动选择最优格式</li>
              <li>• 设置合理的 <code className="bg-purple-100 px-1 rounded">resize.maxWidth/maxHeight</code> 避免过大图片</li>
              <li>• 生产环境使用 <code className="bg-purple-100 px-1 rounded">preserveOriginal: false</code> 节省空间</li>
              <li>• 启用 <code className="bg-purple-100 px-1 rounded">generateManifest</code> 便于分析压缩效果</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          常见问题解决
        </h2>
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Q: 构建时间过长怎么办？
            </h3>
            <p className="text-slate-600 text-sm mb-2">
              A: 检查以下配置：
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 确保启用了缓存 <code className="bg-slate-100 px-1 rounded">cache.enabled: true</code></li>
              <li>• 优化 include/exclude 模式，避免处理不必要的文件</li>
              <li>• 考虑在开发模式禁用压缩 <code className="bg-slate-100 px-1 rounded">dev.enabled: false</code></li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Q: 图片质量不满意怎么调整？
            </h3>
            <p className="text-slate-600 text-sm mb-2">
              A: 尝试以下配置：
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 提高质量设置 <code className="bg-slate-100 px-1 rounded">quality: 90</code></li>
              <li>• 使用保守模式 <code className="bg-slate-100 px-1 rounded">mode: 'conservative'</code></li>
              <li>• 指定输出格式 <code className="bg-slate-100 px-1 rounded">format: 'png'</code> (无损)</li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Q: 如何在不同环境使用不同配置？
            </h3>
            <p className="text-slate-600 text-sm mb-2">
              A: 使用环境变量或条件配置：
            </p>
            <CodeBlock
              code={`// vite.config.js
export default defineConfig(({ mode }) => ({
  plugins: [
    rustyPic({
      quality: mode === 'production' ? 80 : 60,
      mode: mode === 'production' ? 'balanced' : 'conservative',
      dev: {
        enabled: mode !== 'development'
      }
    })
  ]
}));`}
              title="环境配置示例"
            />
          </div>
        </div>
      </section>
    </div>
  );
}