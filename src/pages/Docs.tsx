import { useState } from "react";
import { Book, ExternalLink, Search, ChevronRight, FileText, Code, Zap, Settings, Users, Github } from "lucide-react";

const quickStartSteps = [
  {
    title: "安装 Rusty-Pic",
    description: "通过 npm 安装核心包",
    code: "npm install @fe-fast/rusty-pic",
    icon: "📦"
  },
  {
    title: "基础使用",
    description: "压缩单个图片文件",
    code: `import { compress } from '@fe-fast/rusty-pic';

const result = await compress(file, {
  quality: 80,
  format: 'webp'
});`,
    icon: "🖼️"
  },
  {
    title: "批量处理",
    description: "同时压缩多个图片",
    code: `import { compressBatch } from '@fe-fast/rusty-pic';

const results = await compressBatch(files, {
  quality: 75
});`,
    icon: "⚡"
  },
  {
    title: "集成到构建流程",
    description: "使用 Vite 插件自动化（即将发布）",
    code: `// vite.config.js
import { rustyPic } from '@fe-fast/vite-plugin-rusty-pic';

export default defineConfig({
  plugins: [rustyPic({ quality: 80 })]
});`,
    icon: "🔧"
  }
];

const docSections = [
  {
    title: "快速开始",
    description: "5分钟上手 Rusty-Pic",
    icon: <Zap className="w-5 h-5" />,
    items: [
      "安装和配置",
      "第一个压缩示例",
      "常用配置选项",
      "错误处理"
    ]
  },
  {
    title: "API 参考",
    description: "完整的 API 文档",
    icon: <Code className="w-5 h-5" />,
    items: [
      "compressImage()",
      "compressBatch()",
      "getImageInfo()",
      "支持的格式",
      "配置选项",
      "TypeScript 类型"
    ]
  },
  {
    title: "CLI 工具",
    description: "命令行使用指南",
    icon: <FileText className="w-5 h-5" />,
    items: [
      "安装 CLI",
      "基础命令",
      "批量处理",
      "配置文件",
      "脚本集成"
    ]
  },
  {
    title: "Vite 插件",
    description: "构建时自动压缩",
    icon: <Settings className="w-5 h-5" />,
    items: [
      "插件安装",
      "基础配置",
      "高级选项",
      "多环境配置",
      "性能优化"
    ]
  },
  {
    title: "最佳实践",
    description: "使用建议和优化技巧",
    icon: <Users className="w-5 h-5" />,
    items: [
      "压缩策略选择",
      "格式选择指南",
      "性能优化",
      "缓存策略",
      "错误处理"
    ]
  },
  {
    title: "高级功能",
    description: "进阶使用和扩展",
    icon: <Book className="w-5 h-5" />,
    items: [
      "自定义压缩算法",
      "批量处理优化",
      "内存管理",
      "多线程支持",
      "插件开发"
    ]
  }
];

const resources = [
  {
    title: "GitHub 仓库",
    description: "源代码、问题反馈和贡献",
    url: "https://github.com/fe-fast/rusty-pic",
    icon: <Github className="w-5 h-5" />
  },
  {
    title: "npm 包页面",
    description: "包信息、版本历史和下载统计",
    url: "https://www.npmjs.com/package/@fe-fast/rusty-pic",
    icon: "📦"
  },
  {
    title: "在线演示",
    description: "交互式压缩工具和效果预览",
    url: "/demo",
    icon: "🎮"
  },
  {
    title: "使用示例",
    description: "详细的代码示例和最佳实践",
    url: "/api",
    icon: "📊"
  }
];

const faqs = [
  {
    question: "Rusty-Pic 与其他图片压缩工具有什么区别？",
    answer: "Rusty-Pic 基于 Rust + WebAssembly 构建，具有更小的包体积（157KB）、更快的处理速度和更好的跨平台兼容性。相比 Sharp 更轻量，比 imagemin 更现代，比 Squoosh 更适合工作流集成。"
  },
  {
    question: "支持哪些图片格式？",
    answer: "输入格式支持 PNG、JPEG、WebP 等常见格式。输出格式支持 PNG、JPEG、WebP、AVIF，可以自动选择最优格式或手动指定。"
  },
  {
    question: "如何在 Node.js 环境中使用？",
    answer: "Rusty-Pic 完全支持 Node.js 环境，可以用于服务端图片处理、构建脚本、批量处理等场景。提供了完整的 TypeScript 类型定义。"
  },
  {
    question: "压缩质量如何控制？",
    answer: "提供 quality (1-100) 参数控制压缩强度，format 参数选择输出格式，optimize 对象控制具体的优化策略，可以根据需求灵活调整。"
  },
  {
    question: "是否支持批量处理？",
    answer: "支持。提供 compressBatch() API 用于批量处理，支持进度回调。CLI 工具和 Vite 插件也将支持批量处理功能。"
  },
  {
    question: "WASM 模块加载失败怎么办？",
    answer: "Rusty-Pic 内置了 Canvas API 作为后备方案。当 WASM 模块加载失败时，会自动降级到 Canvas API，确保功能的可用性。"
  }
];

export default function Docs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const filteredSections = docSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Release Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="font-medium">🎉 v0.1.2 已发布!</span>
            <a
              href="https://www.npmjs.com/package/@fe-fast/rusty-pic"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-sm transition-colors"
            >
              查看 npm 包
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Book className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          文档中心
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          完整的使用指南、API 参考和最佳实践，帮助您快速掌握 Rusty-Pic 的所有功能。
        </p>
      </div>

      {/* Search */}
      <div className="mb-12">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜索文档..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Quick Start */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          🚀 快速开始
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStartSteps.map((step, index) => (
            <div key={index} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-2xl mb-3">{step.icon}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {step.description}
              </p>
              <div className="bg-slate-900 rounded-lg p-3">
                <code className="text-xs text-slate-300 whitespace-pre-wrap">
                  {step.code}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          📚 文档导航
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSections.map((section, index) => (
            <div key={index} className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {section.description}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-center text-sm text-slate-600">
                    <ChevronRight className="w-4 h-4 mr-2 text-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          🔗 相关资源
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((resource, index) => (
            <a
              key={index}
              href={resource.url}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow group block"
              target={resource.url.startsWith('http') ? '_blank' : '_self'}
              rel={resource.url.startsWith('http') ? 'noopener noreferrer' : ''}
            >
              <div className="flex items-center mb-3">
                {typeof resource.icon === 'string' ? (
                  <span className="text-2xl mr-3">{resource.icon}</span>
                ) : (
                  <div className="w-8 h-8 text-blue-500 mr-3">{resource.icon}</div>
                )}
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {resource.title}
              </h3>
              <p className="text-sm text-slate-600">
                {resource.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          ❓ 常见问题
        </h2>
        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {faq.question}
                  </h3>
                  <ChevronRight
                    className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-90' : ''
                      }`}
                  />
                </div>
              </button>
              {expandedFaq === index && (
                <div className="px-6 pb-4">
                  <p className="text-slate-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Getting Help */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          需要帮助？
        </h2>
        <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
          如果您在使用过程中遇到问题，或者有功能建议，欢迎通过以下方式联系我们：
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com/fe-fast/rusty-pic/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Github className="w-5 h-5 mr-2" />
            GitHub Issues
          </a>
          <a
            href="https://github.com/fe-fast/rusty-pic/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-5 h-5 mr-2" />
            社区讨论
          </a>
          <a
            href="https://www.npmjs.com/package/@fe-fast/rusty-pic"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            📦 npm 包页面
          </a>
        </div>
      </section>
    </div>
  );
}