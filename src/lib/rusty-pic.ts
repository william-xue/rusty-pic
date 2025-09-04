/**
 * Rusty-Pic JavaScript API
 * 
 * 提供易用的高级 JavaScript API，封装 WASM 模块
 */

// 导入类型定义
export interface CompressionOptions {
    format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';
    quality?: number; // 0-100
    resize?: {
        width?: number;
        height?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };
    optimize?: {
        colors?: boolean;
        progressive?: boolean;
        lossless?: boolean;
    };
}

export interface CompressionResult {
    data: Uint8Array;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
    format: string;
    metadata?: {
        width: number;
        height: number;
        colorType: string;
        bitDepth: number;
    };
}

export interface BatchProgress {
    completed: number;
    total: number;
    currentFile?: string;
    errors: Array<{ file: string; error: string }>;
}

export type ProgressCallback = (progress: BatchProgress) => void;

/**
 * 主要的 RustyPic 类
 */
export class RustyPic {
    private wasmModule: any = null;
    private initialized = false;

    constructor() {
        // 构造函数保持轻量
    }

    /**
     * 初始化 WASM 模块
     */
    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            // 动态导入 WASM 模块
            const wasmModule = await import('../../pkg/rusty_pic_wasm.js');
            await wasmModule.default();
            this.wasmModule = wasmModule;
            this.initialized = true;
        } catch (error) {
            console.warn('WASM module failed to load, falling back to Canvas API:', error);
            // 不抛出错误，而是使用 Canvas API 作为后备
        }
    }

    /**
     * 压缩单个图片
     */
    async compress(input: File | Uint8Array | ArrayBuffer, options: CompressionOptions = {}): Promise<CompressionResult> {
        await this.init();

        const startTime = Date.now();
        let inputData: Uint8Array;

        // 处理不同的输入类型
        if (input instanceof File) {
            inputData = new Uint8Array(await input.arrayBuffer());
        } else if (input instanceof ArrayBuffer) {
            inputData = new Uint8Array(input);
        } else {
            inputData = input;
        }

        const originalSize = inputData.length;

        // 尝试使用 WASM 模块
        if (this.wasmModule && this.initialized) {
            try {
                return await this.compressWithWasm(inputData, options, originalSize, startTime);
            } catch (error) {
                console.warn('WASM compression failed, falling back to Canvas API:', error);
            }
        }

        // 后备方案：使用 Canvas API
        return await this.compressWithCanvas(input as File, options, originalSize, startTime);
    }

    /**
     * 使用 WASM 模块压缩
     */
    private async compressWithWasm(
        inputData: Uint8Array,
        options: CompressionOptions,
        originalSize: number,
        startTime: number
    ): Promise<CompressionResult> {
        const { createRustyPic, JsCompressionOptions } = this.wasmModule;

        const rp = createRustyPic();
        const opt = new JsCompressionOptions();

        // 设置压缩选项
        if (options.format) opt.setFormat(options.format);
        if (options.quality !== undefined) opt.setQuality(options.quality);
        if (options.resize) {
            opt.setResize(options.resize.width, options.resize.height, options.resize.fit);
        }
        if (options.optimize) {
            opt.setOptimize(options.optimize.colors, options.optimize.progressive, options.optimize.lossless);
        }

        const result = await rp.compress(inputData, opt);
        const processingTime = Date.now() - startTime;

        return {
            data: result.data,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            compressionRatio: result.compressionRatio,
            processingTime,
            format: result.format,
        };
    }

    /**
     * 使用 Canvas API 压缩（后备方案）
     */
    private async compressWithCanvas(
        file: File,
        options: CompressionOptions,
        originalSize: number,
        startTime: number
    ): Promise<CompressionResult> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                try {
                    let { width, height } = img;

                    // 处理缩放
                    if (options.resize) {
                        if (options.resize.width && width > options.resize.width) {
                            height = (height * options.resize.width) / width;
                            width = options.resize.width;
                        }
                        if (options.resize.height && height > options.resize.height) {
                            width = (width * options.resize.height) / height;
                            height = options.resize.height;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx?.drawImage(img, 0, 0, width, height);

                    const outputFormat = options.format === 'auto' ? 'webp' : (options.format || 'webp');
                    const quality = (options.quality || 80) / 100;
                    const mimeType = `image/${outputFormat === 'jpeg' ? 'jpeg' : outputFormat}`;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const data = new Uint8Array(reader.result as ArrayBuffer);
                                const processingTime = Date.now() - startTime;

                                resolve({
                                    data,
                                    originalSize,
                                    compressedSize: data.length,
                                    compressionRatio: Math.max(0, (1 - data.length / originalSize) * 100),
                                    processingTime,
                                    format: outputFormat,
                                    metadata: {
                                        width,
                                        height,
                                        colorType: 'rgba',
                                        bitDepth: 8,
                                    },
                                });
                            };
                            reader.readAsArrayBuffer(blob);
                        } else {
                            reject(new Error('Canvas compression failed'));
                        }
                    }, mimeType, quality);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Image load failed'));

            if (file instanceof File) {
                img.src = URL.createObjectURL(file);
            } else {
                reject(new Error('Canvas API requires File input'));
            }
        });
    }

    /**
     * 批量压缩多个文件
     */
    async compressBatch(
        files: File[],
        options: CompressionOptions = {},
        onProgress?: ProgressCallback
    ): Promise<CompressionResult[]> {
        await this.init();

        const results: CompressionResult[] = [];
        const errors: Array<{ file: string; error: string }> = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 更新进度
            if (onProgress) {
                onProgress({
                    completed: i,
                    total: files.length,
                    currentFile: file.name,
                    errors,
                });
            }

            try {
                const result = await this.compress(file, options);
                results.push(result);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                errors.push({ file: file.name, error: errorMsg });
                console.error(`Failed to compress ${file.name}:`, error);
            }
        }

        // 最终进度更新
        if (onProgress) {
            onProgress({
                completed: files.length,
                total: files.length,
                errors,
            });
        }

        return results;
    }

    /**
     * 智能压缩 - 自动选择最佳参数
     */
    async smartCompress(
        input: File | Uint8Array | ArrayBuffer,
        targetSize?: number
    ): Promise<CompressionResult> {
        await this.init();

        // 分析输入文件
        const analysis = await this.analyzeImage(input);

        // 基于分析结果选择最佳参数
        const options: CompressionOptions = {
            format: this.selectOptimalFormat(analysis),
            quality: this.selectOptimalQuality(analysis, targetSize),
            optimize: {
                colors: true,
                progressive: analysis.complexity > 0.5,
                lossless: false,
            },
        };

        let result = await this.compress(input, options);

        // 如果指定了目标大小，进行迭代优化
        if (targetSize && result.compressedSize > targetSize) {
            result = await this.iterativeCompress(input, options, targetSize);
        }

        return result;
    }

    /**
     * 分析图片特征
     */
    private async analyzeImage(input: File | Uint8Array | ArrayBuffer): Promise<any> {
        // 简化的图片分析
        if (input instanceof File) {
            return {
                format: input.type.split('/')[1] || 'unknown',
                size: input.size,
                complexity: 0.5, // 默认复杂度
                hasAlpha: input.type.includes('png'),
            };
        }

        return {
            format: 'unknown',
            size: input instanceof ArrayBuffer ? input.byteLength : input.length,
            complexity: 0.5,
            hasAlpha: false,
        };
    }

    /**
     * 选择最佳格式
     */
    private selectOptimalFormat(analysis: any): string {
        if (analysis.hasAlpha) return 'webp';
        if (analysis.complexity > 0.7) return 'jpeg';
        return 'webp';
    }

    /**
     * 选择最佳质量
     */
    private selectOptimalQuality(analysis: any, targetSize?: number): number {
        if (targetSize) {
            // 基于目标大小估算质量
            const ratio = targetSize / analysis.size;
            if (ratio > 0.8) return 90;
            if (ratio > 0.5) return 75;
            if (ratio > 0.3) return 60;
            return 45;
        }

        // 基于复杂度选择质量
        if (analysis.complexity > 0.7) return 85;
        if (analysis.complexity > 0.4) return 80;
        return 75;
    }

    /**
     * 迭代压缩以达到目标大小
     */
    private async iterativeCompress(
        input: File | Uint8Array | ArrayBuffer,
        baseOptions: CompressionOptions,
        targetSize: number
    ): Promise<CompressionResult> {
        let quality = baseOptions.quality || 80;
        let result = await this.compress(input, { ...baseOptions, quality });

        // 最多尝试 5 次
        for (let i = 0; i < 5 && result.compressedSize > targetSize; i++) {
            quality = Math.max(10, quality - 15);
            result = await this.compress(input, { ...baseOptions, quality });
        }

        return result;
    }

    /**
     * 获取支持的格式列表
     */
    getSupportedFormats(): string[] {
        return ['webp', 'jpeg', 'png', 'avif'];
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * 获取版本信息
     */
    getVersion(): string {
        return '0.1.0';
    }
}

// 导出默认实例
export const rustyPic = new RustyPic();

// 导出便捷函数
export async function compress(
    input: File | Uint8Array | ArrayBuffer,
    options: CompressionOptions = {}
): Promise<CompressionResult> {
    return rustyPic.compress(input, options);
}

export async function compressBatch(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: ProgressCallback
): Promise<CompressionResult[]> {
    return rustyPic.compressBatch(files, options, onProgress);
}

export async function smartCompress(
    input: File | Uint8Array | ArrayBuffer,
    targetSize?: number
): Promise<CompressionResult> {
    return rustyPic.smartCompress(input, targetSize);
}