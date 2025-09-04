const fs = require('fs');
const path = require('path');

// 读取 TypeScript 文件
const tsContent = fs.readFileSync('src/cli/index.ts', 'utf8');

// 转换 TypeScript 到 JavaScript
let jsContent = tsContent
    // 移除 shebang 并重新添加
    .replace(/^#!.*\n/, '')
    // 移除 import type 语句
    .replace(/import.*type.*from.*;\n?/g, '')
    // 移除类型注解
    .replace(/:\s*[A-Za-z<>[\]|{},\s]+(?=\s*[=,)])/g, '')
    // 移除泛型
    .replace(/<[^>]+>/g, '')
    // 移除接口定义
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
    // 移除类型断言
    .replace(/as\s+\w+/g, '')
    // 修复导入路径
    .replace(/from\s+['"]([^'"]+)\.ts['"]/g, "from '$1.js'");

// 添加 shebang
jsContent = '#!/usr/bin/env node\n\n' + jsContent;

// 确保目录存在
const distDir = 'dist/cli';
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 写入 JavaScript 文件
fs.writeFileSync(path.join(distDir, 'index.js'), jsContent);

console.log('✅ CLI tool converted to JavaScript');