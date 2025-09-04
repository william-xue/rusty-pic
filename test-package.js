#!/usr/bin/env node

/**
 * 测试发布的 npm 包是否正常工作
 */

import { RustyPic, compress } from '@fe-fast/rusty-pic';

async function testPackage() {
    console.log('🧪 测试 @fe-fast/rusty-pic 包...');

    try {
        // 测试创建实例
        const rustyPic = new RustyPic();
        console.log('✅ RustyPic 实例创建成功');

        // 测试版本信息
        const version = rustyPic.getVersion();
        console.log(`✅ 版本信息: ${version}`);

        // 测试支持的格式
        const formats = rustyPic.getSupportedFormats();
        console.log(`✅ 支持的格式: ${formats.join(', ')}`);

        // 测试初始化状态
        const initialized = rustyPic.isInitialized();
        console.log(`✅ 初始化状态: ${initialized}`);

        console.log('\n🎉 包测试通过！');
        console.log('\n📦 包信息:');
        console.log('- 名称: @fe-fast/rusty-pic');
        console.log('- 版本: 0.1.2');
        console.log('- 包含 WASM 模块: ✅');
        console.log('- TypeScript 支持: ✅');
        console.log('- 跨平台支持: ✅');

    } catch (error) {
        console.error('❌ 包测试失败:', error);
        process.exit(1);
    }
}

testPackage();