#!/bin/bash

# 发布前构建脚本
set -e

echo "🚀 开始构建 @fe-fast/rusty-pic 用于发布..."

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf dist pkg

# 构建 WASM 模块
echo "🦀 构建 WASM 模块..."
export PATH="$HOME/.cargo/bin:$PATH"
wasm-pack build --target web --out-dir pkg crates/rusty-pic-wasm

# 构建 TypeScript 库
echo "📦 构建 TypeScript 库..."
mkdir -p dist/lib
tsc src/lib/rusty-pic.ts --outDir dist/lib --target es2020 --module es2020 --declaration --esModuleInterop --allowSyntheticDefaultImports

# 构建 CLI 工具
echo "🛠️ 构建 CLI 工具..."
mkdir -p dist/cli
tsc src/cli/index.ts --outDir dist/cli --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule

# 添加 shebang 到 CLI
echo "#!/usr/bin/env node" | cat - dist/cli/index.js > temp && mv temp dist/cli/index.js
chmod +x dist/cli/index.js

# 验证构建结果
echo "✅ 验证构建结果..."
if [ ! -f "dist/lib/rusty-pic.js" ]; then
    echo "❌ 库文件构建失败"
    exit 1
fi

if [ ! -f "dist/lib/rusty-pic.d.ts" ]; then
    echo "❌ 类型定义文件构建失败"
    exit 1
fi

if [ ! -f "dist/cli/index.js" ]; then
    echo "❌ CLI 工具构建失败"
    exit 1
fi

if [ ! -f "pkg/rusty_pic_wasm.js" ]; then
    echo "❌ WASM 模块构建失败"
    exit 1
fi

echo "🎉 构建完成！准备发布到 npm..."
echo ""
echo "📋 构建产物："
echo "  - dist/lib/rusty-pic.js (主库文件)"
echo "  - dist/lib/rusty-pic.d.ts (类型定义)"
echo "  - dist/cli/index.js (CLI 工具)"
echo "  - pkg/ (WASM 模块)"
echo ""
echo "🚀 运行以下命令发布："
echo "  npm publish"