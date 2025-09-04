/**
 * Next.js Integration for Rusty-Pic
 * 
 * Next.js 项目的 Rusty-Pic 集成
 */

const { rustyPicPlugin } = require('./index.js');

/**
 * Next.js 配置包装器
 * @param {object} nextConfig - Next.js 配置
 * @returns {object} 增强的 Next.js 配置
 */
function withRustyPic(nextConfig = {}) {
    return {
        ...nextConfig,

        webpack(config, { buildId, dev, isServer, defaultLoaders, webpack }) {
            // 调用原始 webpack 配置
            if (typeof nextConfig.webpack === 'function') {
                config = nextConfig.webpack(config, { buildId, dev, isServer, defaultLoaders, webpack });
            }

            // 添加 Rusty-Pic 处理
            if (!isServer) {
                const rustyPicOptions = nextConfig.rustyPic || {};

                // 默认配置
                const defaultOptions = {
                    include: ['public/**/*.{png,jpg,jpeg,webp}', 'src/**/*.{png,jpg,jpeg,webp}'],
                    exclude: ['node_modules/**'],
                    quality: 80,
                    format: 'auto',
                    outputDir: 'public/optimized',
                    dev: {
                        enabled: false, // Next.js 开发模式下默认禁用
                    },
                    build: {
                        enabled: true,
                    },
                    verbose: !dev,
                };

                const finalOptions = { ...defaultOptions, ...rustyPicOptions };

                // 添加自定义 loader
                config.module.rules.push({
                    test: /\.(png|jpe?g|webp)$/i,
                    use: [
                        {
                            loader: require.resolve('./next-loader.js'),
                            options: finalOptions,
                        },
                    ],
                });
            }

            return config;
        },

        // 添加图片优化到构建过程
        async rewrites() {
            const rewrites = [];

            // 调用原始 rewrites
            if (typeof nextConfig.rewrites === 'function') {
                const originalRewrites = await nextConfig.rewrites();
                rewrites.push(...originalRewrites);
            }

            // 添加优化图片的重写规则
            if (nextConfig.rustyPic?.outputDir) {
                rewrites.push({
                    source: '/optimized/:path*',
                    destination: `/${nextConfig.rustyPic.outputDir}/:path*`,
                });
            }

            return rewrites;
        },
    };
}

module.exports = { withRustyPic };