#!/usr/bin/env node

/**
 * CLI 工具测试脚本
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

console.log('🧪 测试 Rusty-Pic CLI 工具...');

// 创建测试图片文件 (简单的 PNG 数据)
const testImagePath = 'test-image.png';
const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
]);

try {
    // 创建测试图片
    writeFileSync(testImagePath, pngData);
    console.log('✅ 创建测试图片成功');

    // 测试 --version
    try {
        const version = execSync('node dist/cli/index.js --version', { encoding: 'utf8' });
        console.log('✅ 版本命令测试通过:', version.trim());
    } catch (error) {
        console.log('❌ 版本命令测试失败:', error.message);
    }

    // 测试 --help
    try {
        const help = execSync('node dist/cli/index.js --help', { encoding: 'utf8' });
        console.log('✅ 帮助命令测试通过');
    } catch (error) {
        console.log('❌ 帮助命令测试失败:', error.message);
    }

    // 测试 compress --help
    try {
        const compressHelp = execSync('node dist/cli/index.js compress --help', { encoding: 'utf8' });
        console.log('✅ 压缩帮助命令测试通过');
    } catch (error) {
        console.log('❌ 压缩帮助命令测试失败:', error.message);
    }

    // 测试 info 命令
    try {
        const info = execSync(`node dist/cli/index.js info ${testImagePath}`, { encoding: 'utf8' });
        console.log('✅ 信息命令测试通过');
        console.log('📋 输出:', info);
    } catch (error) {
        console.log('❌ 信息命令测试失败:', error.message);
    }

    console.log('\n🎉 CLI 工具基础功能测试完成！');
    console.log('\n📦 全局安装方法:');
    console.log('```bash');
    console.log('npm install -g @fe-fast/rusty-pic');
    console.log('rusty-pic --help');
    console.log('```');

    console.log('\n📦 本地测试方法:');
    console.log('```bash');
    console.log('npm link');
    console.log('rusty-pic --help');
    console.log('```');

} catch (error) {
    console.error('❌ 测试失败:', error.message);
} finally {
    // 清理测试文件
    if (existsSync(testImagePath)) {
        unlinkSync(testImagePath);
        console.log('🧹 清理测试文件完成');
    }
}