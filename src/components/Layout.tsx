import { Outlet, Link, useLocation } from "react-router-dom";
import { Image, Terminal, Code, Puzzle, BookOpen, Github } from "lucide-react";

const navigation = [
  { name: "首页", href: "/", icon: Image },
  { name: "在线演示", href: "/demo", icon: Image },
  { name: "CLI 工具", href: "/cli", icon: Terminal },
  { name: "API 接口", href: "/api", icon: Code },
  { name: "Vite 插件", href: "/vite-plugin", icon: Puzzle },
  { name: "文档", href: "/docs", icon: BookOpen },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Rusty-Pic
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                        ? "bg-orange-100 text-orange-700"
                        : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* GitHub Link */}
            <a
              href="https://github.com/william-xue/rusty-pic"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-slate-200">
          <div className="px-4 py-2">
            <div className="flex space-x-1 overflow-x-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive
                        ? "bg-orange-100 text-orange-700"
                        : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                      }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p className="text-sm">
              © 2024 Rusty-Pic. 基于 Rust + WebAssembly 的极限图片压缩工具.
            </p>
            <p className="text-xs mt-2">
              专注于弱网环境和低端设备的图片优化解决方案
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}