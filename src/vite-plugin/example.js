/**
 * Vite Plugin Usage Examples
 * 
 * 各种使用场景的配置示例
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rustyPic } from './index.js';

// 基础配置
export const basicConfig = defineConfig({
    plugins: [
        react(),
        rustyPic({
            quality: 80,
            format: 'auto'
        })
    ]
});

// 高级配置
export const advancedConfig = defineConfig({
    plugins: [
        react(),
        rustyPic({
            // 文件匹配
            include: ['src/assets/**/*.{png,jpg,jpeg,webp}'],
            exclude: ['**/icons/**', '**/*.svg'],

            // 压缩配置
            quality: 85,
            format: 'webp',

            // 尺寸限制
            resize: {
                maxWidth: 1920,
                maxHeight: 1080,
                fit: 'inside'
            },

            // 优化选项
            optimize: {
                colors: true,
                progressive: true,
                lossless: false
            },

            // 输出配置
            outputDir: 'dist/optimized',
            generateManifest: true,
            preserveOriginal: false,

            // 环境配置
            dev: {
                enabled: false, // 开发时禁用
                quality: 60
            },

            build: {
                enabled: true,
                generateWebp: true,
                generateAvif: false
            },

            // 缓存和日志
            cache: {
                enabled: true,
                dir: 'node_modules/.cache/rusty-pic'
            },

            verbose: true,
            logLevel: 'info'
        })
    ]
});

// 环境相关配置
export const environmentConfig = defineConfig(({ mode }) => ({
    plugins: [
        react(),
        rustyPic({
            quality: mode === 'production' ? 80 : 60,
            format: mode === 'production' ? 'webp' : 'auto',

            dev: {
                enabled: mode !== 'development'
            },

            build: {
                enabled: mode === 'production',
                generateWebp: true,
                generateAvif: mode === 'production'
            },

            verbose: mode === 'production',
            generateManifest: mode === 'production'
        })
    ]
}));

// 多格式输出配置
export const multiFormatConfig = defineConfig({
    plugins: [
        react(),
        // WebP 输出
        rustyPic({
            include: ['src/assets/**/*.{png,jpg,jpeg}'],
            format: 'webp',
            quality: 80,
            outputDir: 'dist/assets/webp'
        }),
        // AVIF 输出 (高压缩率)
        rustyPic({
            include: ['src/assets/**/*.{png,jpg,jpeg}'],
            format: 'avif',
            quality: 70,
            outputDir: 'dist/assets/avif'
        })
    ]
});

// 性能优化配置
export const performanceConfig = defineConfig({
    plugins: [
        react(),
        rustyPic({
            // 只处理大图片
            include: ['src/assets/**/*.{png,jpg,jpeg}'],

            // 激进压缩
            quality: 75,
            format: 'webp',

            // 尺寸限制
            resize: {
                maxWidth: 1200,
                maxHeight: 800,
                fit: 'inside'
            },

            // 启用所有优化
            optimize: {
                colors: true,
                progressive: true,
                lossless: false
            },

            // 开发时禁用
            dev: {
                enabled: false
            },

            // 启用缓存
            cache: {
                enabled: true
            },

            // 生成报告
            generateManifest: true,
            verbose: true
        })
    ]
});