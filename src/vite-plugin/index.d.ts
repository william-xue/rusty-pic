/**
 * Type definitions for Rusty-Pic Vite Plugin
 */

import type { Plugin } from 'vite';

export interface RustyPicPluginOptions {
    /**
     * 要处理的文件模式
     * @default ['**\/*.{png,jpg,jpeg,webp}']
     */
    include?: string | string[];

    /**
     * 要排除的文件模式
     * @default []
     */
    exclude?: string | string[];

    /**
     * 压缩质量 (1-100)
     * @default 80
     */
    quality?: number;

    /**
     * 输出格式
     * @default 'auto'
     */
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';

    /**
     * 尺寸配置
     */
    resize?: {
        /**
         * 最大宽度
         */
        maxWidth?: number;
        /**
         * 最大高度
         */
        maxHeight?: number;
        /**
         * 缩放模式
         * @default 'inside'
         */
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };

    /**
     * 优化配置
     */
    optimize?: {
        /**
         * 启用颜色优化
         * @default true
         */
        colors?: boolean;
        /**
         * 启用渐进式编码
         * @default false
         */
        progressive?: boolean;
        /**
         * 启用无损压缩
         * @default false
         */
        lossless?: boolean;
    };

    /**
     * 输出目录
     * @default 'dist/assets'
     */
    outputDir?: string;

    /**
     * 生成压缩清单文件
     * @default false
     */
    generateManifest?: boolean;

    /**
     * 保留原始文件
     * @default false
     */
    preserveOriginal?: boolean;

    /**
     * 开发模式配置
     */
    dev?: {
        /**
         * 开发模式下是否启用压缩
         * @default false
         */
        enabled?: boolean;
        /**
         * 开发模式下的压缩质量
         * @default 60
         */
        quality?: number;
    };

    /**
     * 生产模式配置
     */
    build?: {
        /**
         * 生产模式下是否启用压缩
         * @default true
         */
        enabled?: boolean;
        /**
         * 生成 WebP 格式
         * @default true
         */
        generateWebp?: boolean;
        /**
         * 生成 AVIF 格式
         * @default false
         */
        generateAvif?: boolean;
    };

    /**
     * 缓存配置
     */
    cache?: {
        /**
         * 启用缓存
         * @default true
         */
        enabled?: boolean;
        /**
         * 缓存目录
         * @default 'node_modules/.cache/rusty-pic'
         */
        dir?: string;
    };

    /**
     * 显示详细日志
     * @default false
     */
    verbose?: boolean;

    /**
     * 日志级别
     * @default 'info'
     */
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Rusty-Pic Vite 插件
 */
export function rustyPicPlugin(options?: RustyPicPluginOptions): Plugin;

/**
 * Rusty-Pic Vite 插件 (别名)
 */
export function rustyPic(options?: RustyPicPluginOptions): Plugin;

/**
 * 默认导出
 */
export default rustyPicPlugin;

/**
 * Next.js 集成配置
 */
export interface NextRustyPicConfig {
    /**
     * Rusty-Pic 配置选项
     */
    rustyPic?: Omit<RustyPicPluginOptions, 'dev' | 'build'> & {
        /**
         * 输出目录 (相对于 public 目录)
         * @default 'optimized'
         */
        outputDir?: string;
    };
}

/**
 * Next.js 配置包装器
 */
export function withRustyPic<T extends NextRustyPicConfig>(config: T): T;

/**
 * Webpack 插件选项
 */
export interface WebpackPluginOptions {
    /**
     * 要处理的文件模式 (RegExp 或字符串)
     */
    include?: RegExp | string;

    /**
     * 要排除的文件模式 (RegExp 或字符串)
     */
    exclude?: RegExp | string;

    /**
     * 压缩质量 (1-100)
     * @default 80
     */
    quality?: number;

    /**
     * 输出格式
     * @default 'auto'
     */
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';

    /**
     * 输出目录
     * @default 'assets/images'
     */
    outputDir?: string;

    /**
     * 显示详细日志
     * @default false
     */
    verbose?: boolean;

    /**
     * 缓存配置
     */
    cache?: {
        enabled?: boolean;
        dir?: string;
    };
}

/**
 * Webpack 插件类
 */
export class RustyPicWebpackPlugin {
    constructor(options?: WebpackPluginOptions);
    apply(compiler: any): void;
}