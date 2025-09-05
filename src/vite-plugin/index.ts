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
        transcode = false,
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

            if (isDev && !dev.enabled) {
                log('info', 'Rusty-Pic disabled in development mode');
                return;
            }

            if (!isDev && !build.enabled) {
                log('info', 'Rusty-Pic disabled in build mode');
                return;
            }

            log('info', `Rusty-Pic plugin initialized (${isDev ? 'development' : 'production'} mode)`);
        },

        async buildStart() {
            await rustyPic.init();
            log('debug', 'Rusty-Pic WASM module initialized');
        },

        // 关键改动：不再在 load 阶段写入磁盘；改为在打包阶段替换 asset 源字节
        async generateBundle(_options, bundle) {
            if (isDev || !build.enabled) return;

            const imageExtRe = /\.(png|jpe?g|webp|avif)$/i;
            const renameMap: Array<{ from: string, to: string }> = [];

            for (const [fileName, output] of Object.entries(bundle)) {
                if (output.type !== 'asset') continue;
                if (!imageExtRe.test(fileName)) continue;

                const originalSource = output.source;
                const originalBuffer = typeof originalSource === 'string' ? Buffer.from(originalSource) : Buffer.from(originalSource);

                const originalExt = (fileName.split('.').pop() || '').toLowerCase();
                // 确定本次压缩的实际格式：若未开启 transcode，则强制使用原扩展名；否则允许切换到用户指定格式
                const effectiveFormat = (() => {
                    if (format === 'auto') return originalExt as any;
                    if (!transcode && format.toLowerCase() !== originalExt) {
                        log('warn', `Requested format \"${format}\" differs from original extension .${originalExt} for ${fileName}. Transcode disabled, falling back to original format.`);
                        return originalExt as any;
                    }
                    return (format as any).toLowerCase();
                })();

                // 缓存命中检查
                const cacheKey = getCacheKey(fileName, originalBuffer);
                const cachedPath = getCachePath(cacheKey, effectiveFormat);
                if (cache.enabled && existsSync(cachedPath)) {
                    const cachedContent = await readFile(cachedPath);
                    if (cachedContent.length <= originalBuffer.length) {
                        output.source = cachedContent;
                        processedFiles.push({
                            originalPath: fileName,
                            compressedPath: fileName,
                            originalSize: originalBuffer.length,
                            compressedSize: cachedContent.length,
                            compressionRatio: ((originalBuffer.length - cachedContent.length) / originalBuffer.length) * 100,
                            processingTime: 0,
                            format: effectiveFormat,
                        });
                        log('debug', `Used cached compressed asset for ${fileName}`);
                        continue;
                    }
                }

                try {
                    const start = Date.now();
                    const file = new File([originalBuffer], basename(fileName));
                    const result = await rustyPic.compress(file, {
                        format: effectiveFormat as any,
                        quality,
                        resize,
                        optimize,
                    } as CompressionOptions);

                    // 仅在更小的时候替换
                    if (result.data.length < originalBuffer.length) {
                        output.source = result.data;

                        // 若需要跨格式转码并且扩展名变化，重命名资产，记录映射待整体替换
                        const currentExt = (fileName.split('.').pop() || '').toLowerCase();
                        if (transcode && effectiveFormat !== currentExt) {
                            const base = fileName.replace(/\.[^./]+$/, '');
                            const newName = `${base}.${result.format}`;
                            renameMap.push({ from: fileName, to: newName });
                            // 修改当前资产文件名
                            (output as any).fileName = newName;
                        }

                        // 写缓存
                        if (cache.enabled) {
                            await ensureDir(cache.dir!);
                            await writeFile(cachedPath, result.data);
                        }

                        const took = Date.now() - start;
                        processedFiles.push({
                            originalPath: fileName,
                            compressedPath: fileName,
                            originalSize: result.originalSize,
                            compressedSize: result.compressedSize,
                            compressionRatio: result.compressionRatio,
                            processingTime: took,
                            format: result.format,
                        });

                        log('info', `Optimized asset ${fileName} (${result.compressionRatio.toFixed(1)}% reduction)`);
                    } else {
                        log('debug', `Skip ${fileName} because compressed size is not smaller.`);
                    }
                } catch (err) {
                    log('error', `Failed to optimize ${fileName}:`, err as any);
                }
            }

            // 若发生了跨格式改名，则需要在所有 chunk 和文本资产中替换引用
            if (renameMap.length > 0) {
                for (const [n, out] of Object.entries(bundle)) {
                    if ((out as any).type === 'chunk' && (out as any).code) {
                        let code = (out as any).code as string;
                        for (const { from, to } of renameMap) {
                            code = code.split(from).join(to);
                        }
                        (out as any).code = code;
                    } else if ((out as any).type === 'asset' && typeof (out as any).source === 'string') {
                        let src = (out as any).source as string;
                        for (const { from, to } of renameMap) {
                            src = src.split(from).join(to);
                        }
                        (out as any).source = src;
                    }
                }
            }
        },

        async writeBundle() {
            await generateManifestFile();
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
