//! Image format modules and pure-Rust PNG implementation fallback
//!
//! This file provides optional submodules for non-PNG formats and an inline
//! pure-Rust PNG encoder using the `image` crate. We define PNG inline to
//! avoid extra files and any C dependencies for wasm32 builds.

// Optional formats behind feature gates (modules are defined elsewhere)
// JPEG support will be added in future versions
// #[cfg(feature = "jpeg")]
// pub mod jpeg;
// AVIF support will be added in future versions
// #[cfg(feature = "avif")]
// pub mod avif;
// WebP support will be added in future versions
// #[cfg(feature = "webp")]
// pub mod webp;

// Inline PNG module implementation
pub mod png {
    #[derive(Clone, Debug)]
    pub struct PngOptions {
        /// 兼容旧 API 的占位字段，当前实现走 image 纯 Rust 编码器
        pub optimization_level: u8,
        pub palette_optimization: bool,
        pub transparency_optimization: bool,
        pub deflate_optimization: bool,
        pub strip_metadata: bool,
        pub interlace: bool,
        pub bit_depth_reduction: bool,
        pub color_type_reduction: bool,
    }

    impl Default for PngOptions {
        fn default() -> Self {
            Self {
                optimization_level: 3,
                palette_optimization: true,
                transparency_optimization: true,
                deflate_optimization: true,
                strip_metadata: true,
                interlace: false,
                bit_depth_reduction: true,
                color_type_reduction: true,
            }
        }
    }

    use crate::{CompressionError, Result};
    use image::codecs::png::{CompressionType, FilterType, PngEncoder};
    use image::ImageEncoder;

    /// 兼容签名的 PNG 编码函数；当前实现直接委托给 image 纯 Rust 编码器
    pub fn encode_optimized(img: &image::DynamicImage, _opts: &PngOptions) -> Result<Vec<u8>> {
        // 选择一个较稳妥的压缩/滤波配置
        let (compression, filter) = (CompressionType::Default, FilterType::Paeth);

        let rgba = img.to_rgba8();
        let (w, h) = (rgba.width(), rgba.height());
        let data = rgba.as_raw();

        let mut out: Vec<u8> = Vec::with_capacity((w * h * 4) as usize / 2 + 1024);
        let enc = PngEncoder::new_with_quality(&mut out, compression, filter);
        enc.write_image(&data, w, h, image::ColorType::Rgba8)
            .map_err(|e| CompressionError::EncodingError(e.to_string()))?;
        Ok(out)
    }
}
