import { Link } from "react-router-dom";
import { ArrowRight, Zap, Package, Globe, Code, Download, Star } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "极限压缩",
    description: "基于 Rust 的高性能压缩算法，在保证图片质量的同时实现最大压缩率",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Globe,
    title: "跨平台支持",
    description: "通过 WebAssembly 技术，支持浏览器、Node.js 和命令行环境",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Package,
    title: "易于集成",
    description: "提供 npm 包、CLI 工具和 Vite 插件，轻松集成到现有项目",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Code,
    title: "开发者友好",
    description: "完整的 TypeScript 支持，丰富的 API 文档和使用示例",
    color: "from-purple-500 to-pink-500"
  }
];

const stats = [
  { label: "压缩率", value: "90%+", description: "平均压缩率" },
  { label: "速度提升", value: "5x", description: "相比传统工具" },
  { label: "支持格式", value: "4+", description: "PNG/JPEG/WebP/AVIF" },
  { label: "包大小", value: "<2MB", description: "WASM 模块大小" }
];

export default function Home() {
  return (
    <div className="">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 mb-6">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Rusty-Pic
              </span>
              <br />
              <span className="text-3xl sm:text-5xl text-slate-700">
                极限图片压缩工具
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              基于 Rust + WebAssembly 技术栈，专为弱网环境和低端设备设计的高性能图片压缩解决方案。
              减少带宽消耗，提升加载速度，让您的应用更快更轻。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/demo"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span>在线体验</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                to="/docs"
                className="inline-flex items-center px-8 py-3 bg-white text-slate-700 font-semibold rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Download className="mr-2 w-5 h-5" />
                <span>查看文档</span>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-20 h-20 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-green-200 rounded-full opacity-20 animate-pulse delay-2000"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-slate-600 mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-slate-500">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              为什么选择 Rusty-Pic？
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              我们结合了 Rust 的性能优势和 WebAssembly 的跨平台特性，
              为您提供前所未有的图片压缩体验。
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 hover:border-slate-200 group"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            准备开始了吗？
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            立即体验 Rusty-Pic 的强大功能，让您的图片更小更快。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/demo"
              className="inline-flex items-center px-8 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Star className="mr-2 w-5 h-5" />
              <span>立即体验</span>
            </Link>
            <Link
              to="/cli"
              className="inline-flex items-center px-8 py-3 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-orange-600 transition-all duration-200"
            >
              <Code className="mr-2 w-5 h-5" />
              <span>查看 CLI</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}