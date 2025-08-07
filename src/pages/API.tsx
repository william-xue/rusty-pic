import { useState } from "react";
import { Code, Copy, Check, Package, Zap, Settings, BookOpen } from "lucide-react";
import { toast } from "sonner";

const installExample = `npm install rusty-pic
# 或者
pnpm add rusty-pic
# 或者
yarn add rusty-pic`;

const basicUsageExample = `import { compressImage } from 'rusty-pic';

// 压缩单个文件
const file = document.getElementById('fileInput').files[0];
const result = await compressImage(file, {
  quality: 80,
  format: 'webp',
  mode: 'balanced'
});

console.log('原始大小:', result.originalSize);
console.log('压缩后大小:', result.compressedSize);
console.log('压缩率:', result.compressionRatio);

// 下载压缩后的文件
const url = URL.createObjectURL(result.blob);
const a = document.createElement('a');
a.href = url;
a.download = 'compressed.webp';
a.click();`;

const advancedExample = `import { compressImage, batchCompress, getOptimalFormat } from 'rusty-pic';

// 批量压缩
const files = Array.from(document.getElementById('fileInput').files);
const results = await batchCompress(files, {
  quality: 85,
  format: 'auto', // 自动选择最优格式
  mode: 'aggressive',
  maxWidth: 1920,
  maxHeight: 1080,
  preserveMetadata: false
});

// 获取最优格式建议
const optimalFormat = await getOptimalFormat(file);
console.log('推荐格式:', optimalFormat);

// 自定义压缩配置
const customResult = await compressImage(file, {
  quality: 90,
  format: 'webp',
  mode: 'conservative',
  resize: {
    width: 800,
    height: 600,
    fit: 'cover'
  },
  watermark: {
    text: 'Compressed by Rusty-Pic',
    position: 'bottom-right',
    opacity: 0.5
  }
});`;

const reactExample = `import React, { useState, useCallback } from 'react';
import { compressImage } from 'rusty-pic';

function ImageCompressor() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files[0]);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const compressed = await compressImage(file, {
        quality: 80,
        format: 'webp',
        mode: 'balanced'
      });
      setResult(compressed);
    } catch (error) {
      console.error('压缩失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleCompress} disabled={!file || isProcessing}>
        {isProcessing ? '压缩中...' : '开始压缩'}
      </button>
      {result && (
        <div>
          <p>原始大小: {result.originalSize} bytes</p>
          <p>压缩后: {result.compressedSize} bytes</p>
          <p>压缩率: {result.compressionRatio.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}`;

const nodeExample = `// Node.js 环境使用
const fs = require('fs');
const { compressImageBuffer } = require('rusty-pic/node');

// 读取文件
const imageBuffer = fs.readFileSync('./input.jpg');

// 压缩
const result = await compressImageBuffer(imageBuffer, {
  quality: 75,
  format: 'webp',
  mode: 'aggressive'
});

// 保存结果
fs.writeFileSync('./output.webp', result.buffer);
console.log('压缩完成，节省了', result.savedBytes, '字节');`;

const typeDefinitions = `interface CompressionOptions {
  quality?: number; // 1-100, 默认 80
  format?: 'webp' | 'jpeg' | 'png' | 'auto'; // 默认 'auto'
  mode?: 'conservative' | 'balanced' | 'aggressive'; // 默认 'balanced'
  maxWidth?: number; // 最大宽度
  maxHeight?: number; // 最大高度
  preserveMetadata?: boolean; // 是否保留元数据，默认 false
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  watermark?: {
    text?: string;
    image?: string | Blob;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number; // 0-1
  };
}

interface CompressionResult {
  blob: Blob; // 压缩后的文件
  originalSize: number; // 原始文件大小（字节）
  compressedSize: number; // 压缩后大小（字节）
  compressionRatio: number; // 压缩率（百分比）
  format: string; // 输出格式
  processingTime: number; // 处理时间（毫秒）
  metadata?: {
    width: number;
    height: number;
    hasAlpha: boolean;
    colorSpace: string;
  };
}

// 主要 API 函数
declare function compressImage(
  file: File | Blob,
  options?: CompressionOptions
): Promise<CompressionResult>;

declare function batchCompress(
  files: (File | Blob)[],
  options?: CompressionOptions
): Promise<CompressionResult[]>;

declare function getOptimalFormat(
  file: File | Blob
): Promise<'webp' | 'jpeg' | 'png'>;

declare function estimateCompressionSize(
  file: File | Blob,
  options?: CompressionOptions
): Promise<number>;`;

const apiMethods = [
  {
    name: "compressImage",
    signature: "(file: File | Blob, options?: CompressionOptions) => Promise<CompressionResult>",
    description: "压缩单个图片文件",
    example: "const result = await compressImage(file, { quality: 80 });"
  },
  {
    name: "batchCompress",
    signature: "(files: (File | Blob)[], options?: CompressionOptions) => Promise<CompressionResult[]>",
    description: "批量压缩多个图片文件",
    example: "const results = await batchCompress(files, { format: 'webp' });"
  },
  {
    name: "getOptimalFormat",
    signature: "(file: File | Blob) => Promise<'webp' | 'jpeg' | 'png'>",
    description: "获取图片的最优压缩格式建议",
    example: "const format = await getOptimalFormat(file);"
  },
  {
    name: "estimateCompressionSize",
    signature: "(file: File | Blob, options?: CompressionOptions) => Promise<number>",
    description: "估算压缩后的文件大小",
    example: "const size = await estimateCompressionSize(file, { quality: 70 });"
  },
  {
    name: "getSupportedFormats",
    signature: "() => string[]",
    description: "获取支持的图片格式列表",
    example: "const formats = getSupportedFormats(); // ['jpeg', 'png', 'webp', 'avif']"
  },
  {
    name: "getVersion",
    signature: "() => string",
    description: "获取当前版本号",
    example: "const version = getVersion(); // '1.0.0'"
  }
];

export default function API() {
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
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Code className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          JavaScript API
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          完整的 TypeScript 支持，简洁的 API 设计，适用于浏览器和 Node.js 环境。
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

      {/* Basic Usage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Zap className="w-6 h-6 mr-2 text-green-500" />
          基础用法
        </h2>
        <CodeBlock code={basicUsageExample} title="基础图片压缩" />
      </section>

      {/* Advanced Usage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-purple-500" />
          高级用法
        </h2>
        <CodeBlock code={advancedExample} title="高级压缩选项" />
      </section>

      {/* Framework Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          框架集成示例
        </h2>
        <div className="space-y-6">
          <CodeBlock code={reactExample} title="React 组件示例" />
          <CodeBlock code={nodeExample} title="Node.js 服务端使用" />
        </div>
      </section>

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <BookOpen className="w-6 h-6 mr-2 text-orange-500" />
          API 参考
        </h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    方法名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    签名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    描述
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {apiMethods.map((method, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {method.name}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded break-all">
                        {method.signature}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-700 mb-2">{method.description}</p>
                        <code className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          {method.example}
                        </code>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Type Definitions */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          TypeScript 类型定义
        </h2>
        <CodeBlock code={typeDefinitions} title="完整类型定义" language="typescript" />
      </section>

      {/* Error Handling */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          错误处理
        </h2>
        <CodeBlock 
          code={`try {
  const result = await compressImage(file, options);
  console.log('压缩成功:', result);
} catch (error) {
  if (error.code === 'UNSUPPORTED_FORMAT') {
    console.error('不支持的图片格式');
  } else if (error.code === 'FILE_TOO_LARGE') {
    console.error('文件过大，请选择较小的文件');
  } else if (error.code === 'WASM_LOAD_FAILED') {
    console.error('WebAssembly 模块加载失败');
  } else {
    console.error('压缩失败:', error.message);
  }
}`}
          title="错误处理示例"
        />
      </section>

      {/* Performance Tips */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          性能优化建议
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              🚀 浏览器环境优化
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 使用 Web Workers 避免阻塞主线程</li>
              <li>• 启用 WASM 模块缓存</li>
              <li>• 批量处理时使用 <code className="bg-blue-100 px-1 rounded">batchCompress</code></li>
              <li>• 大文件建议先调用 <code className="bg-blue-100 px-1 rounded">estimateCompressionSize</code></li>
            </ul>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              💡 内存管理
            </h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li>• 及时释放 Blob URL: <code className="bg-green-100 px-1 rounded">URL.revokeObjectURL()</code></li>
              <li>• 大批量处理时分批进行</li>
              <li>• 避免同时处理过多大文件</li>
              <li>• 使用 <code className="bg-green-100 px-1 rounded">preserveMetadata: false</code> 减少内存占用</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}