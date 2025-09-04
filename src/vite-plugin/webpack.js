/**
 * Webpack Plugin for Rusty-Pic
 * 
 * 独立的 Webpack 插件，用于非 Vite 项目
 */

const { readFile, writeFile, mkdir } = require('fs/promises');
const { dirname, basename, extname, join, relative } = require('path');
const { existsSync } = require('fs');
const { createHash } = require('crypto');

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
            compilation.hooks.processAssets.tapAsync(
                {
                    name: pluginName,
                    stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
                },
                async (assets, callback) => {
                    try {
                        // 处理所有匹配的资源
                        const promises = [];

                        for (const [filename, asset] of Object.entries(assets)) {
                            if (this.shouldProcessFile(filename)) {
                                const content = asset.source();
                                if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
                                    promises.push(this.processAsset(filename, content));
                                }
                            }
                        }

                        await Promise.all(promises);

                        // 添加压缩后的资源到编译结果
                        for (const [originalPath, processed] of this.processedFiles) {
                            compilation.emitAsset(processed.outputPath, {
                                source: () => processed.content,
                                size: () => processed.content.length,
                            });
                        }

                        callback();
                    } catch (error) {
                        callback(error);
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

module.exports = RustyPicWebpackPlugin;