const fs = require('fs');
const path = require('path');

// 手动创建正确的 CLI JavaScript 文件
const jsContent = `#!/usr/bin/env node

/**
 * Rusty-Pic CLI Tool
 * 
 * 命令行图片压缩工具
 */

import { program } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { basename, extname, join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { rustyPic } from '../lib/rusty-pic.js';

// 版本信息
const version = '0.3.1';

// 主程序
program
    .name('rusty-pic')
    .description('高性能图片压缩工具')
    .version(version);

// 压缩命令
program
    .command('compress')
    .description('压缩单个或多个图片文件')
    .argument('<input>', '输入文件或目录')
    .option('-o, --output <path>', '输出路径')
    .option('-q, --quality <number>', '压缩质量 (0-100)', '80')
    .option('-f, --format <format>', '输出格式 (webp|jpeg|png|auto)', 'auto')
    .option('--width <number>', '最大宽度')
    .option('--height <number>', '最大高度')
    .option('--progressive', '启用渐进式编码')
    .option('--lossless', '启用无损压缩')
    .action(async (input, options) => {
        try {
            await compressCommand(input, options);
        } catch (error) {
            console.error('压缩失败:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// 批量压缩命令
program
    .command('batch')
    .description('批量压缩目录中的所有图片')
    .argument('<input>', '输入目录')
    .option('-o, --output <path>', '输出目录')
    .option('-q, --quality <number>', '压缩质量 (0-100)', '80')
    .option('-f, --format <format>', '输出格式 (webp|jpeg|png|auto)', 'auto')
    .option('--width <number>', '最大宽度')
    .option('--height <number>', '最大高度')
    .option('--recursive', '递归处理子目录')
    .action(async (input, options) => {
        try {
            await batchCommand(input, options);
        } catch (error) {
            console.error('批量压缩失败:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// 智能压缩命令
program
    .command('smart')
    .description('智能压缩，自动选择最佳参数')
    .argument('<input>', '输入文件')
    .option('-o, --output <path>', '输出路径')
    .option('-s, --size <number>', '目标文件大小 (字节)')
    .action(async (input, options) => {
        try {
            await smartCommand(input, options);
        } catch (error) {
            console.error('智能压缩失败:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// 信息命令
program
    .command('info')
    .description('显示图片信息')
    .argument('<input>', '输入文件')
    .action(async (input) => {
        try {
            await infoCommand(input);
        } catch (error) {
            console.error('获取信息失败:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

/**
 * 压缩命令实现
 */
async function compressCommand(input, options) {
    console.log(\`🚀 开始压缩: \${input}\`);

    // 读取输入文件
    const inputBuffer = await readFile(input);
    const inputFile = new File([inputBuffer], basename(input));

    // 构建压缩选项
    const compressionOptions = {
        format: options.format,
        quality: parseInt(options.quality),
        resize: (options.width || options.height) ? {
            width: options.width ? parseInt(options.width) : undefined,
            height: options.height ? parseInt(options.height) : undefined,
            fit: 'contain'
        } : undefined,
        optimize: {
            progressive: options.progressive || false,
            lossless: options.lossless || false,
            colors: true,
        }
    };

    // 执行压缩
    const result = await rustyPic.compress(inputFile, compressionOptions);

    // 确定输出路径
    const outputPath = options.output || generateOutputPath(input, result.format);

    // 确保输出目录存在
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    // 写入压缩结果
    await writeFile(outputPath, result.data);

    // 显示结果
    console.log('✅ 压缩完成!');
    console.log(\`📁 输出文件: \${outputPath}\`);
    console.log(\`📊 原始大小: \${formatFileSize(result.originalSize)}\`);
    console.log(\`📊 压缩后大小: \${formatFileSize(result.compressedSize)}\`);
    console.log(\`📊 压缩率: \${result.compressionRatio.toFixed(1)}%\`);
    console.log(\`⏱️  处理时间: \${result.processingTime}ms\`);
    console.log(\`🎨 输出格式: \${result.format.toUpperCase()}\`);
}

/**
 * 批量压缩命令实现
 */
async function batchCommand(input, options) {
    console.log(\`🚀 开始批量压缩: \${input}\`);

    // 这里应该实现目录遍历和批量处理
    // 为了简化，暂时只显示提示信息
    console.log('📝 批量压缩功能正在开发中...');
    console.log('💡 提示: 请使用单文件压缩命令处理每个文件');
}

/**
 * 智能压缩命令实现
 */
async function smartCommand(input, options) {
    console.log(\`🧠 开始智能压缩: \${input}\`);

    // 读取输入文件
    const inputBuffer = await readFile(input);
    const inputFile = new File([inputBuffer], basename(input));

    // 执行智能压缩
    const targetSize = options.size ? parseInt(options.size) : undefined;
    const result = await rustyPic.smartCompress(inputFile, targetSize);

    // 确定输出路径
    const outputPath = options.output || generateOutputPath(input, result.format);

    // 确保输出目录存在
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    // 写入压缩结果
    await writeFile(outputPath, result.data);

    // 显示结果
    console.log('✅ 智能压缩完成!');
    console.log(\`📁 输出文件: \${outputPath}\`);
    console.log(\`📊 原始大小: \${formatFileSize(result.originalSize)}\`);
    console.log(\`📊 压缩后大小: \${formatFileSize(result.compressedSize)}\`);
    console.log(\`📊 压缩率: \${result.compressionRatio.toFixed(1)}%\`);
    console.log(\`⏱️  处理时间: \${result.processingTime}ms\`);
    console.log(\`🎨 输出格式: \${result.format.toUpperCase()}\`);

    if (targetSize && result.compressedSize <= targetSize) {
        console.log(\`🎯 已达到目标大小: \${formatFileSize(targetSize)}\`);
    }
}

/**
 * 信息命令实现
 */
async function infoCommand(input) {
    console.log(\`📋 图片信息: \${input}\`);

    // 读取文件信息
    const inputBuffer = await readFile(input);
    const { statSync } = await import('fs');
    const stats = statSync(input);

    console.log(\`📁 文件路径: \${input}\`);
    console.log(\`📊 文件大小: \${formatFileSize(stats.size)}\`);
    console.log(\`📅 修改时间: \${stats.mtime.toLocaleString()}\`);
    console.log(\`🎨 文件格式: \${extname(input).slice(1).toUpperCase() || '未知'}\`);

    // 这里可以添加更多图片元数据分析
    console.log('💡 提示: 详细的图片元数据分析功能正在开发中...');
}

/**
 * 生成输出文件路径
 */
function generateOutputPath(inputPath, format) {
    const dir = dirname(inputPath);
    const name = basename(inputPath, extname(inputPath));
    return join(dir, \`\${name}_compressed.\${format}\`);
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 解析命令行参数
program.parse();
`;

// 确保目录存在
const distDir = 'dist/cli';
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 写入 JavaScript 文件
fs.writeFileSync(path.join(distDir, 'index.js'), jsContent);

console.log('✅ CLI tool fixed and converted to JavaScript');