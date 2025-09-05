/**
 * Webpack Plugin for Rusty-Pic
 * 
 * 独立的 Webpack 插件，用于非 Vite 项目
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, basename, extname, join, relative } from 'path';
import { existsSync } from 'fs';
import { createHash } from 'crypto';

class RustyPicWebpackPlugin {
    constructor(options = {}) {
        this.options = {
            // 默认配置
            include: /\.(png|jpe?g|webp)$/i,
            exclude: /node_modules/,
            quality: 80,
            format: 'auto',
            outputDir: 'assets/images',
            verbose: false,
            cache: {
                enabled: true,
                dir: 'node_modules/.cache/rusty-pic-webpack',
            },
            ...options,
        };

        this.processedFiles = new Map();
        this.rustyPic = null;
    }

    async initRustyPic() {
        if (!this.rustyPic) {
            const module = await import('../lib/rusty-pic.js');
            this.rustyPic = module.rustyPic;
            await this.rustyPic.init();
        }
        return this.rustyPic;
    }

    shouldProcessFile(filename) {
        // 检查 include 模式
        if (this.options.include) {
            if (this.options.include instanceof RegExp) {
                if (!this.options.include.test(filename)) return false;
            } else if (typeof this.options.include === 'string') {
                if (!filename.includes(this.options.include)) return false;
            }
        }

        // 检查 exclude 模式
        if (this.options.exclude) {
            if (this.options.exclude instanceof RegExp) {
                if (this.options.exclude.test(filename)) return false;
            } else if (typeof this.options.exclude === 'string') {
                if (filename.includes(this.options.exclude)) return false;
            }
        }

        return true;
    }

    getCacheKey(content, filename) {
        const hash = createHash('md5');
        hash.update(content);
        hash.update(filename);
        hash.update(JSON.stringify(this.options));
        return hash.digest('hex');
    }

    async processAsset(filename, content) {
        try {
            const rp = await this.initRustyPic();
            const originalSize = content.length;

            // 生成缓存键和输出路径
            const cacheKey = this.getCacheKey(content, filename);
            const outputFormat = this.options.format === 'auto' ? 'webp' : this.options.format;
            const outputFilename = `${basename(filename, extname(filename))}-${cacheKey.slice(0, 8)}.${outputFormat}`;
            const outputPath = join(this.options.outputDir, outputFilename);

            // 检查缓存
            if (this.options.cache.enabled) {
                const cachePath = join(this.options.cache.dir, `${cacheKey}.${outputFormat}`);
                if (existsSync(cachePath)) {
                    const cachedContent = await readFile(cachePath);
                    this.processedFiles.set(filename, {
                        originalPath: filename,
                        outputPath,
                        content: cachedContent,
                        originalSize,
                        compressedSize: cachedContent.length,
                    });
                    return;
                }
            }

            // 创建 File 对象并压缩
            const file = new File([content], basename(filename));
            const result = await rp.compress(file, {
                format: this.options.format,
                quality: this.options.quality,
                optimize: {
                    colors: true,
                    progressive: false,
                    lossless: false,
                },
            });

            // 缓存结果
            if (this.options.cache.enabled) {
                await mkdir(this.options.cache.dir, { recursive: true });
                const cachePath = join(this.options.cache.dir, `${cacheKey}.${result.format}`);
                await writeFile(cachePath, result.data);
            }

            // 记录处理结果
            this.processedFiles.set(filename, {
                originalPath: filename,
                outputPath,
                content: result.data,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                compressionRatio: result.compressionRatio,
            });

            if (this.options.verbose) {
                console.log(`[rusty-pic] ${filename} -> ${outputPath} (${result.compressionRatio.toFixed(1)}% reduction)`);
            }

        } catch (error) {
            console.error(`[rusty-pic] Error processing ${filename}:`, error);
        }
    }

    apply(compiler) {
        const pluginName = 'RustyPicWebpackPlugin';

        compiler.hooks.compilation.tap(pluginName, (compilation) => {
            // 处理资源
            // 在优化尺寸阶段更新原资产的字节，确保 contenthash 和引用自然生效
            const stage = compiler.webpack?.Compilation?.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE || compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE || compilation.PROCESS_ASSETS_STAGE_OPTIMIZE;

            compilation.hooks.processAssets.tapPromise(
                {
                    name: pluginName,
                    stage,
                },
                async (assets) => {
                    let RawSource;
                    try {
                        // ESM/CJS 兼容导入
                        const ws = await import('webpack-sources');
                        RawSource = ws.RawSource || ws.default?.RawSource;
                    } catch (e) {
                        throw e;
                    }
                    try {
                        const tasks = [];

                        for (const [filename, asset] of Object.entries(assets)) {
                            if (!this.shouldProcessFile(filename)) continue;

                            const src = compilation.getAsset(filename)?.source?.source?.();
                            if (typeof src === 'string' || Buffer.isBuffer(src) || src instanceof Uint8Array) {
                                const buf = typeof src === 'string' ? Buffer.from(src) : Buffer.from(src);

                                tasks.push((async () => {
                                    try {
                                        // 强制与原始扩展名一致，避免需要改引用
                                        const ext = extname(filename).slice(1).toLowerCase();
                                        const effectiveFormat = (this.options.format === 'auto' || (this.options.format && this.options.format !== ext)) ? ext : this.options.format;

                                        const cacheKey = this.getCacheKey(buf, filename + `|fmt:${effectiveFormat}`);
                                        const cachePath = join(this.options.cache.dir, `${cacheKey}.${effectiveFormat}`);

                                        let compressed = null;
                                        if (this.options.cache.enabled && existsSync(cachePath)) {
                                            const cachedContent = await readFile(cachePath);
                                            compressed = { data: cachedContent, format: effectiveFormat, originalSize: buf.length, compressedSize: cachedContent.length, compressionRatio: (buf.length - cachedContent.length) / buf.length * 100 };
                                        } else {
                                            const rp = await this.initRustyPic();
                                            const file = new File([buf], basename(filename));
                                            const result = await rp.compress(file, {
                                                format: effectiveFormat,
                                                quality: this.options.quality,
                                                optimize: this.options.optimize ?? { colors: true, progressive: false, lossless: false },
                                            });
                                            // 仅在更小的时候替换并写缓存
                                            if (this.options.cache.enabled) {
                                                await mkdir(this.options.cache.dir, { recursive: true });
                                                await writeFile(cachePath, result.data);
                                            }
                                            compressed = result;
                                        }

                                        if (compressed && compressed.data.length < buf.length) {
compilation.updateAsset(filename, new RawSource(Buffer.isBuffer(compressed.data) ? compressed.data : Buffer.from(compressed.data)));
                                            this.processedFiles.set(filename, {
                                                originalPath: filename,
                                                outputPath: filename,
                                                content: compressed.data,
                                                originalSize: compressed.originalSize,
                                                compressedSize: compressed.compressedSize,
                                                compressionRatio: compressed.compressionRatio,
                                            });

                                            if (this.options.verbose) {
                                                console.log(`[rusty-pic] optimized ${filename} (${compressed.compressionRatio.toFixed(1)}% reduction)`);
                                            }
                                        }
                                    } catch (e) {
                                        console.error(`[rusty-pic] Failed to optimize ${filename}:`, e);
                                    }
                                })());
                            }
                        }

                        await Promise.all(tasks);
                    } catch (error) {
                        console.error(`[rusty-pic] Error optimizing assets:`, error);
                    }
                }
            );

            // 生成统计信息
            compilation.hooks.afterProcessAssets.tap(pluginName, () => {
                if (this.options.verbose && this.processedFiles.size > 0) {
                    let totalOriginalSize = 0;
                    let totalCompressedSize = 0;

                    for (const processed of this.processedFiles.values()) {
                        totalOriginalSize += processed.originalSize;
                        totalCompressedSize += processed.compressedSize;
                    }

                    const totalSavings = totalOriginalSize - totalCompressedSize;
                    const averageRatio = (totalSavings / totalOriginalSize * 100).toFixed(1);

                    console.log(`[rusty-pic] Processed ${this.processedFiles.size} images`);
                    console.log(`[rusty-pic] Total savings: ${(totalSavings / 1024 / 1024).toFixed(2)}MB (${averageRatio}% reduction)`);
                }

                // 清理处理文件记录
                this.processedFiles.clear();
            });
        });
    }
}

export default RustyPicWebpackPlugin;
