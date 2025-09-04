#!/usr/bin/env node

/**
 * 测试 Vite 插件是否正常工作
 */

async function testVitePlugin() {
    console.log('🧪 测试 Vite 插件...');

    try {
        // 测试导入插件
        const { rustyPic, rustyPicPlugin } = await import('./dist/vite-plugin/index.js');
        console.log('✅ 插件导入成功');

        // 测试创建插件实例
        const plugin = rustyPic({
            quality: 80,
            format: 'webp',
            verbose: true
        });

        console.log('✅ 插件实例创建成功');
        console.log(`✅ 插件名称: ${plugin.name}`);

        // 测试插件方法
        if (typeof plugin.configResolved === 'function') {
            console.log('✅ configResolved 方法存在');
        }

        if (typeof plugin.buildStart === 'function') {
            console.log('✅ buildStart 方法存在');
        }

        if (typeof plugin.load === 'function') {
            console.log('✅ load 方法存在');
        }

        console.log('\n🎉 Vite 插件测试通过！');
        console.log('\n📦 使用方法:');
        console.log('```javascript');
        console.log('import { rustyPic } from "@fe-fast/rusty-pic/vite";');
        console.log('');
        console.log('export default defineConfig({');
        console.log('  plugins: [');
        console.log('    rustyPic({');
        console.log('      quality: 80,');
        console.log('      format: "webp"');
        console.log('    })');
        console.log('  ]');
        console.log('});');
        console.log('```');

    } catch (error) {
        console.error('❌ Vite 插件测试失败:', error);
        process.exit(1);
    }
}

testVitePlugin();