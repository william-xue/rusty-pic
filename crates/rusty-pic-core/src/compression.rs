//! Core compression engine

use crate::{
    performance::{MemoryPool, SimdProcessor},
    CompressionError, ImageAnalyzer, ImageMetadata, Result,
};
use image::{DynamicImage, GenericImageView};
use rayon::prelude::*;
use std::sync::Arc;
use std::time::Instant;

/// Main compression engine that coordinates different format encoders
pub struct CompressionEngine {
    analyzer: ImageAnalyzer,
    memory_pool: Arc<MemoryPool>,
    #[cfg(feature = "logging")]
    logger_enabled: bool,
}

impl CompressionEngine {
    pub fn new() -> Self {
        // Create memory pool with 4MB buffers and 8 buffers in pool
        let memory_pool = Arc::new(MemoryPool::new(4 * 1024 * 1024, 8));

        Self {
            analyzer: ImageAnalyzer::new(),
            memory_pool,
            #[cfg(feature = "logging")]
            logger_enabled: true,
        }
    }

    /// Create a new compression engine with custom memory pool settings
    pub fn with_memory_pool(buffer_size: usize, pool_size: usize) -> Self {
        let memory_pool = Arc::new(MemoryPool::new(buffer_size, pool_size));

        Self {
            analyzer: ImageAnalyzer::new(),
            memory_pool,
            #[cfg(feature = "logging")]
            logger_enabled: true,
        }
    }

    /// Compress multiple images in parallel with optimal performance
    pub fn compress_batch(
        &self,
        images: Vec<&[u8]>,
        options: &CompressionOptions,
    ) -> Vec<Result<CompressionResult>> {
        let options = Arc::new(options.clone());

        // Use parallel processing for batch operations
        images
            .into_par_iter()
            .map(|data| {
                let opts = Arc::clone(&options);
                self.compress_with_optimizations(data, &opts)
            })
            .collect()
    }

    /// Compress an image with the given options
    pub fn compress(&self, data: &[u8], options: &CompressionOptions) -> Result<CompressionResult> {
        self.compress_with_optimizations(data, options)
    }

    /// Internal compression method with performance optimizations
    fn compress_with_optimizations(
        &self,
        data: &[u8],
        options: &CompressionOptions,
    ) -> Result<CompressionResult> {
        let start_time = Instant::now();
        let original_size = data.len();

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::debug!("Starting compression of {} bytes", original_size);
        }

        // Load and analyze the image
        let img = image::load_from_memory(data)?;
        let analysis = self.analyzer.analyze(data)?;

        // Determine target format
        let target_format = self.determine_target_format(options, &analysis);

        // Apply resize if specified with memory optimization
        let processed_img = self.apply_resize_optimized(&img, &options.resize)?;

        // Perform compression with SIMD optimizations
        let compressed_data =
            self.compress_to_format_optimized(&processed_img, &target_format, options)?;

        let processing_time = start_time.elapsed().as_millis() as u64;
        let compressed_size = compressed_data.len();
        let compression_ratio = if original_size > 0 {
            compressed_size as f32 / original_size as f32
        } else {
            1.0
        };

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::info!(
                "Compression complete: {} -> {} bytes ({:.1}% of original) in {}ms",
                original_size,
                compressed_size,
                compression_ratio * 100.0,
                processing_time
            );
        }

        Ok(CompressionResult {
            data: compressed_data,
            original_size,
            compressed_size,
            compression_ratio,
            format: target_format,
            processing_time,
            metadata: analysis.metadata,
        })
    }

    /// Determine the target format based on options and analysis
    fn determine_target_format(
        &self,
        options: &CompressionOptions,
        analysis: &crate::ImageAnalysis,
    ) -> String {
        if let Some(ref format) = options.format {
            if format == "auto" {
                analysis.recommended_format.clone()
            } else {
                format.clone()
            }
        } else {
            analysis.recommended_format.clone()
        }
    }

    /// Apply resize operations with memory optimization
    fn apply_resize_optimized(
        &self,
        img: &DynamicImage,
        resize_options: &Option<ResizeOptions>,
    ) -> Result<DynamicImage> {
        if let Some(resize) = resize_options {
            let (current_width, current_height) = img.dimensions();

            let (new_width, new_height) = self.calculate_resize_dimensions(
                current_width,
                current_height,
                resize.width,
                resize.height,
                &resize.fit,
            )?;

            if new_width != current_width || new_height != current_height {
                #[cfg(feature = "logging")]
                log::debug!(
                    "Resizing from {}x{} to {}x{} (optimized)",
                    current_width,
                    current_height,
                    new_width,
                    new_height
                );

                let filter = match resize.fit.as_str() {
                    "cover" | "fill" => image::imageops::FilterType::Lanczos3,
                    _ => image::imageops::FilterType::Triangle,
                };

                // 大图分块并行缩放：按行块切片后并行 resize，再拼接
                let pixel_count = current_width as usize * current_height as usize;
                if pixel_count > 4_000_000 {
                    // 将图像转为 RGBA8 以便安全切片
                    let rgba = img.to_rgba8();
                    let src_width = current_width;
                    let src_height = current_height;

                    // 设定块行高，确保至少 8 块
                    let target_blocks = 8usize;
                    let block_rows =
                        std::cmp::max(1, (src_height as usize + target_blocks - 1) / target_blocks)
                            as u32;

                    // 为每个块计算源/目标 y 范围
                    let mut parts: Vec<(u32, u32)> = Vec::new();
                    let mut y = 0u32;
                    while y < src_height {
                        let h = std::cmp::min(block_rows, src_height - y);
                        parts.push((y, h));
                        y += h;
                    }

                    use image::{imageops, RgbaImage};
                    // 并行处理每个块：裁剪 -> 缩放到对应目标高度比例
                    let scaled_parts: Vec<RgbaImage> = parts
                        .into_par_iter()
                        .map(|(y0, h)| {
                            let view = imageops::crop_imm(&rgba, 0, y0, src_width, h).to_image();
                            // 计算该块在目标图中的高度（按比例）
                            let dest_h = std::cmp::max(
                                1,
                                ((h as u64 * new_height as u64) / src_height as u64) as u32,
                            );
                            imageops::resize(&view, new_width, dest_h, filter)
                        })
                        .collect();

                    // 拼接各块
                    let mut out = RgbaImage::new(new_width, new_height);
                    let mut dy = 0u32;
                    for block in scaled_parts {
                        let bh = block.height();
                        imageops::replace(&mut out, &block, 0, dy as i64);
                        dy += bh;
                        if dy >= new_height {
                            break;
                        }
                    }

                    Ok(DynamicImage::ImageRgba8(out))
                } else {
                    // 中小图走一次性缩放
                    Ok(img.resize(new_width, new_height, filter))
                }
            } else {
                Ok(img.clone())
            }
        } else {
            Ok(img.clone())
        }
    }

    /// Calculate new dimensions based on resize options
    fn calculate_resize_dimensions(
        &self,
        current_width: u32,
        current_height: u32,
        target_width: Option<u32>,
        target_height: Option<u32>,
        fit: &str,
    ) -> Result<(u32, u32)> {
        match (target_width, target_height) {
            (Some(w), Some(h)) => {
                match fit {
                    "fill" => Ok((w, h)),
                    "contain" => {
                        let ratio_w = w as f32 / current_width as f32;
                        let ratio_h = h as f32 / current_height as f32;
                        let ratio = ratio_w.min(ratio_h);
                        Ok((
                            (current_width as f32 * ratio) as u32,
                            (current_height as f32 * ratio) as u32,
                        ))
                    }
                    "cover" => {
                        let ratio_w = w as f32 / current_width as f32;
                        let ratio_h = h as f32 / current_height as f32;
                        let ratio = ratio_w.max(ratio_h);
                        Ok((
                            (current_width as f32 * ratio) as u32,
                            (current_height as f32 * ratio) as u32,
                        ))
                    }
                    _ => Ok((w, h)), // Default to fill
                }
            }
            (Some(w), None) => {
                let ratio = w as f32 / current_width as f32;
                Ok((w, (current_height as f32 * ratio) as u32))
            }
            (None, Some(h)) => {
                let ratio = h as f32 / current_height as f32;
                Ok(((current_width as f32 * ratio) as u32, h))
            }
            (None, None) => Ok((current_width, current_height)),
        }
    }

    /// Compress image to specified format with SIMD optimizations
    fn compress_to_format_optimized(
        &self,
        img: &DynamicImage,
        format: &str,
        options: &CompressionOptions,
    ) -> Result<Vec<u8>> {
        // Try zero-copy transfer first
        if let Some(data) = crate::performance::ZeroCopyTransfer::transfer_compatible(img, format) {
            #[cfg(feature = "logging")]
            if self.logger_enabled {
                log::debug!("Using zero-copy transfer for format: {}", format);
            }
            return Ok(data);
        }

        self.compress_to_format_with_simd(img, format, options)
    }

    /// Internal compression method with SIMD acceleration
    fn compress_to_format_with_simd(
        &self,
        img: &DynamicImage,
        format: &str,
        options: &CompressionOptions,
    ) -> Result<Vec<u8>> {
        // Get a buffer from the memory pool for temporary operations
        let _temp_buffer = self.memory_pool.get_buffer();

        match format {
            "jpeg" | "jpg" => {
                // JPEG support will be added in future versions
                return Err(CompressionError::UnsupportedFeature(
                    "JPEG format not yet implemented".to_string(),
                ));
            }
            "png" => {
                // 纯 Rust PNG 编码路径：使用 image::codecs::png::PngEncoder
                use image::codecs::png::{CompressionType, FilterType, PngEncoder};
                use image::ImageEncoder;

                // 编码参数：在 wasm 环境避免引入任何 C 依赖
                let lossless = options.optimize.as_ref().map_or(false, |o| o.lossless);
                // 压缩级别与过滤器选择做一个简单映射
                let (compression, filter) = if lossless {
                    (CompressionType::Best, FilterType::Paeth)
                } else {
                    (CompressionType::Default, FilterType::Sub)
                };

                // 将 DynamicImage 规范化为 RGBA8，保持通用性（含透明）
                let rgba = img.to_rgba8();
                let (w, h) = (rgba.width(), rgba.height());
                let data = rgba.as_raw();

                let mut out: Vec<u8> = Vec::with_capacity((w * h * 4) as usize / 2 + 1024);
                {
                    let enc = PngEncoder::new_with_quality(&mut out, compression, filter);
                    enc.write_image(&data, w, h, image::ColorType::Rgba8)
                        .map_err(|e| CompressionError::EncodingError(e.to_string()))?;
                }
                Ok(out)
            }
            "webp" => {
                // WebP support will be added in future versions
                return Err(CompressionError::UnsupportedFeature(
                    "WebP format not yet implemented".to_string(),
                ));
            }
            "avif" => {
                // AVIF support will be added in future versions
                return Err(CompressionError::UnsupportedFeature(
                    "AVIF format not yet implemented".to_string(),
                ));
            }
            _ => {
                return Err(CompressionError::UnsupportedFeature(format!(
                    "Format '{}' not supported (feature not enabled)",
                    format
                )));
            }
        }
    }

    /// Apply color optimizations with parallel preprocessing for large images
    fn apply_simd_color_optimization(
        &self,
        img: &DynamicImage,
        target_format: &str,
    ) -> Result<DynamicImage> {
        let (width, height) = img.dimensions();
        let pixel_count = width as usize * height as usize;

        if pixel_count < 100_000 {
            return Ok(img.clone());
        }

        match target_format {
            "jpeg" => {
                // JPEG 不支持 alpha，转 RGB 并对数据进行并行量化以利于后续编码压缩
                let rgb_img = match img {
                    DynamicImage::ImageRgb8(rgb) => rgb.clone(),
                    _ => img.to_rgb8(),
                };
                let mut data = rgb_img.into_raw();

                // 分块并行量化（64 级）
                SimdProcessor::quantize_colors_simd(&mut data, 64);

                let buf = image::ImageBuffer::from_raw(width, height, data).ok_or_else(|| {
                    CompressionError::MemoryError("Failed to create optimized RGB buffer".into())
                })?;
                Ok(DynamicImage::ImageRgb8(buf))
            }
            "webp" | "avif" => {
                // 对 RGB 进行并行颜色空间往返（模拟 YUV 预处理），对 RGBA 保持原样
                match img {
                    DynamicImage::ImageRgb8(rgb) => {
                        let data = rgb.as_raw();
                        let yuv = SimdProcessor::rgb_to_yuv_simd(data);
                        let back = SimdProcessor::yuv_to_rgb_simd(&yuv);
                        let buf =
                            image::ImageBuffer::from_raw(width, height, back).ok_or_else(|| {
                                CompressionError::MemoryError(
                                    "Failed to create optimized RGB buffer".into(),
                                )
                            })?;
                        Ok(DynamicImage::ImageRgb8(buf))
                    }
                    DynamicImage::ImageRgba8(_) => Ok(img.clone()),
                    _ => Ok(img.clone()),
                }
            }
            _ => Ok(img.clone()),
        }
    }
}

impl Default for CompressionEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Options for compression
#[derive(Debug, Clone)]
pub struct CompressionOptions {
    pub format: Option<String>,
    pub quality: Option<u8>,
    pub resize: Option<ResizeOptions>,
    pub optimize: Option<OptimizeOptions>,
}

#[derive(Debug, Clone)]
pub struct ResizeOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fit: String, // "cover", "contain", "fill", "inside", "outside"
}

#[derive(Debug, Clone)]
pub struct OptimizeOptions {
    pub colors: bool,
    pub progressive: bool,
    pub lossless: bool,
}

/// Result of compression operation
#[derive(Debug, Clone)]
pub struct CompressionResult {
    pub data: Vec<u8>,
    pub original_size: usize,
    pub compressed_size: usize,
    pub compression_ratio: f32,
    pub format: String,
    pub processing_time: u64, // milliseconds
    pub metadata: ImageMetadata,
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_engine_new() {
        let engine = CompressionEngine::new();
        // Test that engine can be created
        assert!(std::ptr::addr_of!(engine) as *const _ != std::ptr::null());
    }

    #[test]
    fn test_compression_options_default() {
        let options = CompressionOptions {
            format: None,
            quality: None,
            resize: None,
            optimize: None,
        };

        assert!(options.format.is_none());
        assert!(options.quality.is_none());
        assert!(options.resize.is_none());
        assert!(options.optimize.is_none());
    }

    #[test]
    fn test_compression_result_clone() {
        let metadata = crate::ImageMetadata {
            width: 100,
            height: 100,
            format: "webp".to_string(),
            color_type: "rgba".to_string(),
            bit_depth: 8,
            has_transparency: false,
        };

        let result = CompressionResult {
            data: vec![1, 2, 3, 4],
            original_size: 1000,
            compressed_size: 500,
            compression_ratio: 0.5,
            format: "webp".to_string(),
            processing_time: 100,
            metadata,
        };

        let cloned = result.clone();
        assert_eq!(result.data, cloned.data);
        assert_eq!(result.original_size, cloned.original_size);
        assert_eq!(result.compressed_size, cloned.compressed_size);
    }

    #[test]
    fn test_compress_empty_data() {
        let engine = CompressionEngine::new();
        let options = CompressionOptions {
            format: Some("webp".to_string()),
            quality: Some(80),
            resize: None,
            optimize: None,
        };

        let result = engine.compress(&[], &options);
        // Should return an error for empty data
        assert!(result.is_err());
    }
}
