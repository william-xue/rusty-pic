/**
 * Vite Plugin for Rusty-Pic
 * 
 * 自动压缩图片资源的 Vite 插件
 */

import type { Plugin, ResolvedConfig } from 'vite';
import { createFilter } from '@rollup/pluginutils';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { dirname, basename, extname, join, relative } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';
import { rustyPic, type CompressionOptions } from '../lib/rusty-pic.js';

export interface RustyPicPluginOptions {
    // 文件匹配
    include?: string | string[];
    exclude?: string | string[];

    // 压缩配置
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';

    // 尺寸配置
    resize?: {
        maxWidth?: number;
        maxHeight?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };

    // 优化配置
    optimize?: {
        colors?: boolean;
        progressive?: boolean;
        lossless?: boolean;
    };

    // 输出配置
    outputDir?: string;
    generateManifest?: boolean;
    preserveOriginal?: boolean;

    // 环境配置
    dev?: {
        enabled?: boolean;
        quality?: number;
    };

    build?: {
        enabled?: boolean;
        generateWebp?: boolean;
        generateAvif?: boolean;
    };

    // 缓存配置
    cache?: {
        enabled?: boolean;
        dir?: string;
    };

    // 日志配置
    verbose?: boolean;
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

interface ProcessedFile {
    originalPath: string;
    compressedPath: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
    format: string;
}

interface PluginManifest {
    version: string;
    timestamp: string;
    files: Record<string, {
        original: {
            path: string;
            size: number;
            format: string;
        };
        compressed: {
            path: string;
            size: number;
            format: string;
            compressionRatio: number;
            processingTime: number;
        };
    }>;
    summary: {
        totalFiles: number;
        originalSize: number;
        compressedSize: number;
        totalSavings: number;
        averageCompressionRatio: number;
        totalProcessingTime: number;
    };
}

export function rustyPicPlugin(options: RustyPicPluginOptions = {}): Plugin {
    const {
        include = ['**/*.{png,jpg,jpeg,webp}'],
        exclude = [],
        quality = 80,
        format = 'auto',
        resize,
        optimize = {
            colors: true,
            progressive: false,
            lossless: false,
        },
        outputDir = 'dist/assets',
        generateManifest = false,
        preserveOriginal = false,
        dev = {
            enabled: false,
            quality: 60,
        },
        build = {
            enabled: true,
            generateWebp: true,
            generateAvif: false,
        },
        cache = {
            enabled: true,
            dir: 'node_modules/.cache/rusty-pic',
        },
        verbose = false,
        logLevel = 'info',
    } = options;

    const filter = createFilter(include, exclude);
    const processedFiles: ProcessedFile[] = [];
    let config: ResolvedConfig;
    let isDev = false;

    const log = (level: string, message: string, ...args: any[]) => {
        if (logLevel === 'silent') return;

        const levels = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(logLevel);
        const messageLevelIndex = levels.indexOf(level);

        if (messageLevelIndex <= currentLevelIndex) {
            const prefix = `[rusty-pic]`;
            (console[level as keyof Console] as any)?.(prefix, message, ...args);
        }
    };

    const getCacheKey = (filePath: string, content: Buffer): string => {
        const hash = createHash('md5');
        hash.update(content);
        hash.update(JSON.stringify({ quality, format, resize, optimize }));
        return hash.digest('hex');
    };

    const getCachePath = (cacheKey: string, format: string): string => {
        return join(cache.dir!, `${cacheKey}.${format}`);
    };

    const ensureDir = async (dirPath: string) => {
        if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
        }
    };

    const processImage = async (filePath: string): Promise<ProcessedFile | null> => {
        try {
            const startTime = Date.now();

            // 读取原始文件
            const originalContent = await readFile(filePath);
            const originalSize = originalContent.length;

            // 检查缓存
            if (cache.enabled) {
                const cacheKey = getCacheKey(filePath, originalContent);
                const cachedPath = getCachePath(cacheKey, format === 'auto' ? 'webp' : format);

                if (existsSync(cachedPath)) {
                    const cachedContent = await readFile(cachedPath);
                    const processingTime = Date.now() - startTime;

                    log('debug', `Using cached result for ${filePath}`);

                    return {
                        originalPath: filePath,
                        compressedPath: cachedPath,
                        originalSize,
                        compressedSize: cachedContent.length,
                        compressionRatio: ((originalSize - cachedContent.length) / originalSize) * 100,
                        processingTime,
                        format: format === 'auto' ? 'webp' : format,
                    };
                }
            }

            // 构建压缩选项
            const compressionOptions: CompressionOptions = {
                format,
                quality: isDev ? (dev.quality || quality) : quality,
                resize,
                optimize,
            };

            // 创建 File 对象
            const file = new File([originalContent], basename(filePath));

            // 执行压缩
            const result = await rustyPic.compress(file, compressionOptions);

            // 生成输出路径
            const outputPath = join(
                outputDir,
                `${basename(filePath, extname(filePath))}-${getCacheKey(filePath, originalContent).slice(0, 8)}.${result.format}`
            );

            // 确保输出目录存在
            await ensureDir(dirname(outputPath));

            // 写入压缩结果
            await writeFile(outputPath, result.data);

            // 缓存结果
            if (cache.enabled) {
                await ensureDir(cache.dir!);
                const cacheKey = getCacheKey(filePath, originalContent);
                const cachedPath = getCachePath(cacheKey, result.format);
                await writeFile(cachedPath, result.data);
            }

            const processingTime = Date.now() - startTime;

            log('info', `Compressed ${relative(process.cwd(), filePath)} -> ${relative(process.cwd(), outputPath)} (${result.compressionRatio.toFixed(1)}% reduction)`);

            return {
                originalPath: filePath,
                compressedPath: outputPath,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                compressionRatio: result.compressionRatio,
                processingTime,
                format: result.format,
            };

        } catch (error) {
            log('error', `Failed to process ${filePath}:`, error);
            return null;
        }
    };

    const generateManifestFile = async () => {
        if (!generateManifest || processedFiles.length === 0) return;

        const manifest: PluginManifest = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            files: {},
            summary: {
                totalFiles: processedFiles.length,
                originalSize: 0,
                compressedSize: 0,
                totalSavings: 0,
                averageCompressionRatio: 0,
                totalProcessingTime: 0,
            },
        };

        for (const file of processedFiles) {
            manifest.files[file.originalPath] = {
                original: {
                    path: file.originalPath,
                    size: file.originalSize,
                    format: extname(file.originalPath).slice(1).toLowerCase(),
                },
                compressed: {
                    path: file.compressedPath,
                    size: file.compressedSize,
                    format: file.format,
                    compressionRatio: file.compressionRatio,
                    processingTime: file.processingTime,
                },
            };

            manifest.summary.originalSize += file.originalSize;
            manifest.summary.compressedSize += file.compressedSize;
            manifest.summary.totalProcessingTime += file.processingTime;
        }

        manifest.summary.totalSavings = manifest.summary.originalSize - manifest.summary.compressedSize;
        manifest.summary.averageCompressionRatio =
            manifest.summary.totalSavings / manifest.summary.originalSize * 100;

        const manifestPath = join(outputDir, 'rusty-pic-manifest.json');
        await ensureDir(dirname(manifestPath));
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

        log('info', `Generated manifest file: ${manifestPath}`);
        log('info', `Summary: ${manifest.summary.totalFiles} files, ${(manifest.summary.totalSavings / 1024 / 1024).toFixed(2)}MB saved (${manifest.summary.averageCompressionRatio.toFixed(1)}% reduction)`);
    };

    return {
        name: 'rusty-pic',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            isDev = config.command === 'serve';

            // 在开发模式下检查是否启用
            if (isDev && !dev.enabled) {
                log('info', 'Rusty-Pic disabled in development mode');
                return;
            }

            // 在生产模式下检查是否启用
            if (!isDev && !build.enabled) {
                log('info', 'Rusty-Pic disabled in build mode');
                return;
            }

            log('info', `Rusty-Pic plugin initialized (${isDev ? 'development' : 'production'} mode)`);
        },

        async buildStart() {
            // 初始化 rusty-pic
            await rustyPic.init();
            log('debug', 'Rusty-Pic WASM module initialized');
        },

        async load(id) {
            // 检查是否应该处理此文件
            if (!filter(id)) return null;

            // 检查文件是否存在
            if (!existsSync(id)) return null;

            // 在开发模式下检查是否启用
            if (isDev && !dev.enabled) return null;

            // 在生产模式下检查是否启用
            if (!isDev && !build.enabled) return null;

            try {
                const stats = await stat(id);
                if (!stats.isFile()) return null;

                log('debug', `Processing image: ${id}`);

                const processed = await processImage(id);
                if (processed) {
                    processedFiles.push(processed);
                }

                return null; // 让 Vite 继续处理原始文件
            } catch (error) {
                log('error', `Error processing ${id}:`, error);
                return null;
            }
        },

        async generateBundle(options, bundle) {
            // 在生产构建时更新资源引用
            if (!isDev && build.enabled) {
                for (const [fileName, chunk] of Object.entries(bundle)) {
                    if (chunk.type === 'chunk' && chunk.code) {
                        let updatedCode = chunk.code;

                        // 更新图片引用路径
                        for (const processed of processedFiles) {
                            const originalPath = relative(process.cwd(), processed.originalPath);
                            const compressedPath = relative(process.cwd(), processed.compressedPath);

                            // 简单的字符串替换，实际项目中可能需要更复杂的逻辑
                            updatedCode = updatedCode.replace(
                                new RegExp(originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                                compressedPath
                            );
                        }

                        if (updatedCode !== chunk.code) {
                            chunk.code = updatedCode;
                            log('debug', `Updated asset references in ${fileName}`);
                        }
                    }
                }
            }
        },

        async writeBundle() {
            // 生成清单文件
            await generateManifestFile();

            // 清理处理文件列表
            processedFiles.length = 0;
        },

        async closeBundle() {
            log('debug', 'Rusty-Pic plugin finished');
        },
    };
}

// 默认导出
export default rustyPicPlugin;

// 命名导出
export { rustyPicPlugin as rustyPic };