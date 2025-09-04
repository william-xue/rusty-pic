/**
 * Next.js Webpack Loader for Rusty-Pic
 * 
 * 在 Next.js 构建过程中处理图片压缩
 */

const { readFile, writeFile, mkdir } = require('fs/promises');
const { dirname, basename, extname, join } = require('path');
const { existsSync } = require('fs');
const { createHash } = require('crypto');

// 动态导入 rusty-pic (ESM)
let rustyPic;

async function initRustyPic() {
    if (!rustyPic) {
        const module = await import('../lib/rusty-pic.js');
        rustyPic = module.rustyPic;
        await rustyPic.init();
    }
    return rustyPic;
}

/**
 * Next.js Webpack Loader
 */
module.exports = async function rustyPicLoader(content) {
    const callback = this.async();
    const options = this.getOptions() || {};

    try {
        // 初始化 rusty-pic
        const rp = await initRustyPic();

        // 获取文件信息
        const resourcePath = this.resourcePath;
        const originalSize = content.length;

        // 生成缓存键
        const hash = createHash('md5');
        hash.update(content);
        hash.update(JSON.stringify(options));
        const cacheKey = hash.digest('hex').slice(0, 8);

        // 构建输出路径
        const outputDir = options.outputDir || 'public/optimized';
        const outputFileName = `${basename(resourcePath, extname(resourcePath))}-${cacheKey}.${options.format === 'auto' ? 'webp' : options.format}`;
        const outputPath = join(process.cwd(), outputDir, outputFileName);

        // 检查是否已经处理过
        if (existsSync(outputPath)) {
            const optimizedContent = await readFile(outputPath);

            // 返回优化后的文件路径
            const publicPath = `/${outputDir}/${outputFileName}`.replace(/\\/g, '/');
            callback(null, `export default ${JSON.stringify(publicPath)}`);
            return;
        }

        // 创建 File 对象
        const file = new File([content], basename(resourcePath));

        // 压缩配置
        const compressionOptions = {
            format: options.format || 'auto',
            quality: options.quality || 80,
            resize: options.resize,
            optimize: options.optimize || {
                colors: true,
                progressive: false,
                lossless: false,
            },
        };

        // 执行压缩
        const result = await rp.compress(file, compressionOptions);

        // 确保输出目录存在
        await mkdir(dirname(outputPath), { recursive: true });

        // 写入压缩结果
        await writeFile(outputPath, result.data);

        // 记录压缩信息
        if (options.verbose) {
            const compressionRatio = ((originalSize - result.compressedSize) / originalSize * 100).toFixed(1);
            console.log(`[rusty-pic] ${resourcePath} -> ${outputPath} (${compressionRatio}% reduction)`);
        }

        // 返回优化后的文件路径
        const publicPath = `/${outputDir}/${outputFileName}`.replace(/\\/g, '/');
        callback(null, `export default ${JSON.stringify(publicPath)}`);

    } catch (error) {
        console.error('[rusty-pic] Error processing image:', error);

        // 发生错误时返回原始文件
        callback(null, content);
    }
};

// 标记为原始 loader（处理二进制数据）
module.exports.raw = true;