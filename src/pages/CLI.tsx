import { useState } from "react";
import { Terminal, Copy, Check, Download, Play, Settings } from "lucide-react";
import { toast } from "sonner";

const installCommands = [
  {
    title: "使用 npm 安装",
    command: "npm install -g rusty-pic-cli",
    description: "全局安装 CLI 工具"
  },
  {
    title: "使用 pnpm 安装",
    command: "pnpm add -g rusty-pic-cli",
    description: "推荐使用 pnpm 安装"
  },
  {
    title: "使用 npx 运行",
    command: "npx rusty-pic-cli",
    description: "无需安装直接使用"
  }
];

const usageExamples = [
  {
    title: "基础压缩",
    command: "rusty-pic compress ./images --output ./compressed",
    description: "压缩指定目录下的所有图片"
  },
  {
    title: "指定格式",
    command: "rusty-pic compress ./images --format webp --quality 80",
    description: "转换为 WebP 格式，质量设为 80%"
  },
  {
    title: "激进压缩",
    command: "rusty-pic compress ./images --mode aggressive --output ./tiny",
    description: "使用激进模式获得最大压缩率"
  },
  {
    title: "批量处理",
    command: "rusty-pic batch ./src/assets --recursive --format auto",
    description: "递归处理目录，自动选择最优格式"
  },
  {
    title: "尺寸调整",
    command: "rusty-pic resize ./images --width 1920 --height 1080 --fit cover",
    description: "调整图片尺寸并压缩"
  },
  {
    title: "配置文件",
    command: "rusty-pic compress --config ./rusty-pic.config.json",
    description: "使用配置文件批量处理"
  }
];

const configExample = `{
  "input": "./src/assets/images",
  "output": "./dist/images",
  "format": "auto",
  "quality": 85,
  "mode": "balanced",
  "recursive": true,
  "preserveMetadata": false,
  "resize": {
    "maxWidth": 1920,
    "maxHeight": 1080,
    "fit": "inside"
  },
  "exclude": ["*.svg", "**/icons/**"]
}`;

const cliOptions = [
  {
    option: "--format, -f",
    values: "webp | jpeg | png | auto",
    description: "输出格式，auto 会自动选择最优格式"
  },
  {
    option: "--quality, -q",
    values: "1-100",
    description: "压缩质量，数值越高质量越好"
  },
  {
    option: "--mode, -m",
    values: "conservative | balanced | aggressive",
    description: "压缩模式"
  },
  {
    option: "--output, -o",
    values: "<path>",
    description: "输出目录路径"
  },
  {
    option: "--recursive, -r",
    values: "boolean",
    description: "递归处理子目录"
  },
  {
    option: "--width, -w",
    values: "<number>",
    description: "最大宽度（像素）"
  },
  {
    option: "--height, -h",
    values: "<number>",
    description: "最大高度（像素）"
  },
  {
    option: "--config, -c",
    values: "<path>",
    description: "配置文件路径"
  },
  {
    option: "--verbose, -v",
    values: "boolean",
    description: "显示详细输出"
  },
  {
    option: "--help",
    values: "-",
    description: "显示帮助信息"
  }
];

export default function CLI() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(text);
      setTimeout(() => setCopiedCommand(null), 2000);
      toast.success('命令已复制到剪贴板');
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const CommandBlock = ({ command, title, description }: { command: string; title: string; description: string }) => (
    <div className="bg-slate-900 rounded-lg p-4 group hover:bg-slate-800 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-300">{title}</h4>
        <button
          onClick={() => copyToClipboard(command)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-all"
          title="复制命令"
        >
          {copiedCommand === command ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <code className="text-green-400 font-mono text-sm block mb-2">
        $ {command}
      </code>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Terminal className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          CLI 命令行工具
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          强大的命令行界面，支持批量处理、自动化脚本和 CI/CD 集成。
        </p>
      </div>

      {/* Installation */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Download className="w-6 h-6 mr-2 text-blue-500" />
          安装方式
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {installCommands.map((item, index) => (
            <CommandBlock
              key={index}
              command={item.command}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Play className="w-6 h-6 mr-2 text-green-500" />
          使用示例
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {usageExamples.map((item, index) => (
            <CommandBlock
              key={index}
              command={item.command}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </section>

      {/* CLI Options */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-purple-500" />
          命令选项
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
                    可选值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    说明
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {cliOptions.map((option, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {option.option}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <code className="bg-slate-100 px-2 py-1 rounded">
                        {option.values}
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

      {/* Configuration File */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          配置文件示例
        </h2>
        <p className="text-slate-600 mb-4">
          创建 <code className="bg-slate-100 px-2 py-1 rounded text-sm">rusty-pic.config.json</code> 文件来保存常用配置：
        </p>
        <div className="bg-slate-900 rounded-lg p-6 relative group">
          <button
            onClick={() => copyToClipboard(configExample)}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-white transition-all"
            title="复制配置"
          >
            {copiedCommand === configExample ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <pre className="text-sm text-slate-300 overflow-x-auto">
            <code>{configExample}</code>
          </pre>
        </div>
      </section>

      {/* Performance Tips */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          性能优化建议
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              🚀 批量处理优化
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 使用 <code className="bg-blue-100 px-1 rounded">--recursive</code> 选项处理整个目录树</li>
              <li>• 配置 <code className="bg-blue-100 px-1 rounded">exclude</code> 模式跳过不需要的文件</li>
              <li>• 使用配置文件避免重复输入参数</li>
              <li>• 在 CI/CD 中使用 <code className="bg-blue-100 px-1 rounded">--verbose</code> 查看详细日志</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              💡 质量与大小平衡
            </h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li>• Web 图片推荐使用 <code className="bg-green-100 px-1 rounded">--format webp</code></li>
              <li>• 移动端可使用 <code className="bg-green-100 px-1 rounded">--mode aggressive</code></li>
              <li>• 高质量图片保持 <code className="bg-green-100 px-1 rounded">--quality 85</code> 以上</li>
              <li>• 缩略图可降低到 <code className="bg-green-100 px-1 rounded">--quality 60</code></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Integration Examples */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          集成示例
        </h2>
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              📦 npm scripts 集成
            </h3>
            <div className="bg-slate-900 rounded-lg p-4">
              <pre className="text-sm text-slate-300">
                <code>{`{
  "scripts": {
    "build:images": "rusty-pic compress ./src/assets --output ./dist/assets",
    "optimize:images": "rusty-pic batch ./public/images --recursive --format auto",
    "compress:prod": "rusty-pic compress ./images --mode aggressive --config ./prod.config.json"
  }
}`}</code>
              </pre>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              🔄 GitHub Actions 集成
            </h3>
            <div className="bg-slate-900 rounded-lg p-4">
              <pre className="text-sm text-slate-300">
                <code>{`name: Optimize Images
on:
  push:
    paths: ['src/assets/**']

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g rusty-pic-cli
      - run: rusty-pic compress ./src/assets --output ./optimized
      - uses: actions/upload-artifact@v3
        with:
          name: optimized-images
          path: ./optimized`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}