//! Performance optimization utilities
//!
//! This module provides SIMD-accelerated pixel processing, memory optimization,
//! and parallel processing utilities for high-performance image compression.

use crate::{CompressionError, Result};
use bytemuck::{cast_slice, cast_slice_mut, Pod, Zeroable};
use image::{DynamicImage, GenericImageView, ImageBuffer, Pixel, Rgb, Rgba};
use rayon::prelude::*;
use std::sync::Arc;
// 移除未用 wide 向量类型（当前实现为并行标量核心）

/// SIMD-accelerated pixel processing operations
pub struct SimdProcessor;

impl SimdProcessor {
    /// "SIMD"-accelerated（当前实现为并行分块 + 标量核心，避免错误SIMD用法）
    pub fn rgb_to_yuv_simd(rgb_data: &[u8]) -> Vec<u8> {
        assert!(rgb_data.len() % 3 == 0, "RGB data length must be multiple of 3");

        // 为避免在并行闭包中可变借用同一 Vec，采用“输出分片”策略：
        // 先分割输出到多个独立小 Vec，最后串行拼接。
        let pixels = rgb_data.len() / 3;
        let block_pixels = 4096usize;
        let blocks: Vec<(usize, usize)> = (0..pixels)
            .step_by(block_pixels)
            .map(|start| {
                let end = (start + block_pixels).min(pixels);
                (start, end)
            })
            .collect();

        let partials: Vec<(usize, Vec<u8>)> = blocks
            .into_par_iter()
            .map(|(start, end)| {
                let mut out = vec![0u8; (end - start) * 3];
                for (idx, i) in (start..end).enumerate() {
                    let si = i * 3;
                    let r = rgb_data[si] as f32;
                    let g = rgb_data[si + 1] as f32;
                    let b = rgb_data[si + 2] as f32;

                    let y = 0.299 * r + 0.587 * g + 0.114 * b;
                    let u = -0.169 * r - 0.331 * g + 0.5 * b + 128.0;
                    let v = 0.5 * r - 0.419 * g - 0.081 * b + 128.0;

                    let di = idx * 3;
                    out[di] = y.clamp(0.0, 255.0) as u8;
                    out[di + 1] = u.clamp(0.0, 255.0) as u8;
                    out[di + 2] = v.clamp(0.0, 255.0) as u8;
                }
                (start, out)
            })
            .collect();

        // 拼接
        let mut yuv_data = vec![0u8; pixels * 3];
        for (start, part) in partials {
            let dst = start * 3;
            yuv_data[dst..dst + part.len()].copy_from_slice(&part);
        }
        yuv_data
    }

    /// 并行分块 + 标量核心（安全且可扩展为真实SIMD）
    pub fn yuv_to_rgb_simd(yuv_data: &[u8]) -> Vec<u8> {
        assert!(yuv_data.len() % 3 == 0, "YUV data length must be multiple of 3");

        let pixels = yuv_data.len() / 3;
        let block_pixels = 4096usize;
        let blocks: Vec<(usize, usize)> = (0..pixels)
            .step_by(block_pixels)
            .map(|start| {
                let end = (start + block_pixels).min(pixels);
                (start, end)
            })
            .collect();

        let partials: Vec<(usize, Vec<u8>)> = blocks
            .into_par_iter()
            .map(|(start, end)| {
                let mut out = vec![0u8; (end - start) * 3];
                for (idx, i) in (start..end).enumerate() {
                    let si = i * 3;
                    let y = yuv_data[si] as f32;
                    let u = yuv_data[si + 1] as f32 - 128.0;
                    let v = yuv_data[si + 2] as f32 - 128.0;

                    let r = y + 1.402 * v;
                    let g = y - 0.344 * u - 0.714 * v;
                    let b = y + 1.772 * u;

                    let di = idx * 3;
                    out[di] = r.clamp(0.0, 255.0) as u8;
                    out[di + 1] = g.clamp(0.0, 255.0) as u8;
                    out[di + 2] = b.clamp(0.0, 255.0) as u8;
                }
                (start, out)
            })
            .collect();

        let mut rgb_data = vec![0u8; pixels * 3];
        for (start, part) in partials {
            let dst = start * 3;
            rgb_data[dst..dst + part.len()].copy_from_slice(&part);
        }
        rgb_data
    }

    /// SIMD-accelerated color quantization
    /// 注意：wide 的 u8x32/f32x8 需要按块安全转换；这里采用按通道标量+并行块的折中方案，避免不正确的向量构造。
    pub fn quantize_colors_simd(pixels: &mut [u8], levels: u8) {
        let levels = levels.max(2);
        let scale = 255.0 / (levels - 1) as f32;
        let inv_scale = 1.0 / scale;

        // 并行分块处理，避免全量锁
        let chunk_len = 4096; // 4KB 块
        let len = pixels.len();

        pixels
            .par_chunks_mut(chunk_len)
            .for_each(|chunk| {
                for v in chunk.iter_mut() {
                    let normalized = (*v as f32) * inv_scale;
                    let quantized = normalized.round() * scale;
                    *v = quantized.clamp(0.0, 255.0) as u8;
                }
            });

        // 无需单独处理 remainder，par_chunks_mut 已覆盖
    }

    /// SIMD-accelerated alpha blending
    pub fn alpha_blend_simd(base: &[u8], overlay: &[u8], output: &mut [u8]) {
        assert_eq!(base.len(), overlay.len());
        assert_eq!(base.len(), output.len());
        assert_eq!(base.len() % 4, 0); // RGBA format

        // Process 16 pixels (64 bytes) at a time
        let chunks = base.chunks_exact(64);
        let remainder = chunks.remainder();

        for ((base_chunk, overlay_chunk), output_chunk) in chunks
            .zip(overlay.chunks_exact(64))
            .zip(output.chunks_exact_mut(64))
        {
            Self::alpha_blend_chunk_simd(base_chunk, overlay_chunk, output_chunk);
        }

        // Handle remainder with scalar operations
        if !remainder.is_empty() {
            let start_idx = base.len() - remainder.len();
            Self::alpha_blend_scalar(remainder, &overlay[start_idx..], &mut output[start_idx..]);
        }
    }

    /// Sobel 并行版本：按扫描行并行，避免 enumerate_pixels_mut 的细粒度开销
    pub fn sobel_edge_detection_simd(
        image: &ImageBuffer<image::Luma<u8>, Vec<u8>>,
    ) -> ImageBuffer<image::Luma<u8>, Vec<u8>> {
        let (width, height) = image.dimensions();
        let mut output = ImageBuffer::new(width, height);

        if width < 3 || height < 3 {
            return output;
        }

        let sobel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        let sobel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        // 仅处理 [1..height-1) 行，边界置零
        let src = image;
        // 为避免并发可变借用，创建新缓冲并在线程内写各自的行切片
        let mut out = output;

        // 先把边界置零
        for x in 0..width {
            out.put_pixel(x, 0, image::Luma([0]));
            out.put_pixel(x, height - 1, image::Luma([0]));
        }
        for y in 0..height {
            out.put_pixel(0, y, image::Luma([0]));
            out.put_pixel(width - 1, y, image::Luma([0]));
        }

        // 并行计算每一行的内容到临时 Vec，再串行写回该行，避免同时可变借用 out
        let rows: Vec<(u32, Vec<u8>)> = (1..height - 1)
            .into_par_iter()
            .map(|y| {
                let mut row = vec![0u8; width as usize];
                for x in 1..width - 1 {
                    let mut gx = 0i32;
                    let mut gy = 0i32;

                    for ky in 0..3 {
                        for kx in 0..3 {
                            let px = x + kx - 1;
                            let py = y + ky - 1;
                            let val = src.get_pixel(px, py)[0] as i32;
                            gx += sobel_x[ky as usize][kx as usize] * val;
                            gy += sobel_y[ky as usize][kx as usize] * val;
                        }
                    }

                    let magnitude = ((gx * gx + gy * gy) as f32).sqrt().min(255.0) as u8;
                    row[x as usize] = magnitude;
                }
                (y, row)
            })
            .collect();

        for (y, row) in rows {
            for x in 1..width - 1 {
                out.put_pixel(x, y, image::Luma([row[x as usize]]));
            }
        }

        out
    }

    // Private helper methods for SIMD operations

    fn convert_rgb_to_yuv_chunk_simd(rgb: &[u8], yuv: &mut [u8]) {
        // RGB to YUV conversion using SIMD
        // Y = 0.299*R + 0.587*G + 0.114*B
        // U = -0.169*R - 0.331*G + 0.5*B + 128
        // V = 0.5*R - 0.419*G - 0.081*B + 128

        for i in (0..rgb.len()).step_by(3) {
            if i + 2 < rgb.len() {
                let r = rgb[i] as f32;
                let g = rgb[i + 1] as f32;
                let b = rgb[i + 2] as f32;

                let y = 0.299 * r + 0.587 * g + 0.114 * b;
                let u = -0.169 * r - 0.331 * g + 0.5 * b + 128.0;
                let v = 0.5 * r - 0.419 * g - 0.081 * b + 128.0;

                yuv[i] = y.clamp(0.0, 255.0) as u8;
                yuv[i + 1] = u.clamp(0.0, 255.0) as u8;
                yuv[i + 2] = v.clamp(0.0, 255.0) as u8;
            }
        }
    }

    fn convert_yuv_to_rgb_chunk_simd(yuv: &[u8], rgb: &mut [u8]) {
        // YUV to RGB conversion using SIMD
        // R = Y + 1.402*(V-128)
        // G = Y - 0.344*(U-128) - 0.714*(V-128)
        // B = Y + 1.772*(U-128)

        for i in (0..yuv.len()).step_by(3) {
            if i + 2 < yuv.len() {
                let y = yuv[i] as f32;
                let u = yuv[i + 1] as f32 - 128.0;
                let v = yuv[i + 2] as f32 - 128.0;

                let r = y + 1.402 * v;
                let g = y - 0.344 * u - 0.714 * v;
                let b = y + 1.772 * u;

                rgb[i] = r.clamp(0.0, 255.0) as u8;
                rgb[i + 1] = g.clamp(0.0, 255.0) as u8;
                rgb[i + 2] = b.clamp(0.0, 255.0) as u8;
            }
        }
    }

    fn convert_rgb_to_yuv_scalar(rgb: &[u8], yuv: &mut [u8]) {
        for i in (0..rgb.len()).step_by(3) {
            if i + 2 < rgb.len() {
                let r = rgb[i] as f32;
                let g = rgb[i + 1] as f32;
                let b = rgb[i + 2] as f32;

                let y = 0.299 * r + 0.587 * g + 0.114 * b;
                let u = -0.169 * r - 0.331 * g + 0.5 * b + 128.0;
                let v = 0.5 * r - 0.419 * g - 0.081 * b + 128.0;

                yuv[i] = y.clamp(0.0, 255.0) as u8;
                yuv[i + 1] = u.clamp(0.0, 255.0) as u8;
                yuv[i + 2] = v.clamp(0.0, 255.0) as u8;
            }
        }
    }

    fn convert_yuv_to_rgb_scalar(yuv: &[u8], rgb: &mut [u8]) {
        for i in (0..yuv.len()).step_by(3) {
            if i + 2 < yuv.len() {
                let y = yuv[i] as f32;
                let u = yuv[i + 1] as f32 - 128.0;
                let v = yuv[i + 2] as f32 - 128.0;

                let r = y + 1.402 * v;
                let g = y - 0.344 * u - 0.714 * v;
                let b = y + 1.772 * u;

                rgb[i] = r.clamp(0.0, 255.0) as u8;
                rgb[i + 1] = g.clamp(0.0, 255.0) as u8;
                rgb[i + 2] = b.clamp(0.0, 255.0) as u8;
            }
        }
    }

    fn alpha_blend_chunk_simd(base: &[u8], overlay: &[u8], output: &mut [u8]) {
        for i in (0..base.len()).step_by(4) {
            if i + 3 < base.len() {
                let base_r = base[i] as f32;
                let base_g = base[i + 1] as f32;
                let base_b = base[i + 2] as f32;
                let base_a = base[i + 3] as f32 / 255.0;

                let overlay_r = overlay[i] as f32;
                let overlay_g = overlay[i + 1] as f32;
                let overlay_b = overlay[i + 2] as f32;
                let overlay_a = overlay[i + 3] as f32 / 255.0;

                let alpha = overlay_a + base_a * (1.0 - overlay_a);

                if alpha > 0.0 {
                    let r = (overlay_r * overlay_a + base_r * base_a * (1.0 - overlay_a)) / alpha;
                    let g = (overlay_g * overlay_a + base_g * base_a * (1.0 - overlay_a)) / alpha;
                    let b = (overlay_b * overlay_a + base_b * base_a * (1.0 - overlay_a)) / alpha;

                    output[i] = r.clamp(0.0, 255.0) as u8;
                    output[i + 1] = g.clamp(0.0, 255.0) as u8;
                    output[i + 2] = b.clamp(0.0, 255.0) as u8;
                    output[i + 3] = (alpha * 255.0).clamp(0.0, 255.0) as u8;
                } else {
                    output[i..i + 4].fill(0);
                }
            }
        }
    }

    fn alpha_blend_scalar(base: &[u8], overlay: &[u8], output: &mut [u8]) {
        for i in (0..base.len()).step_by(4) {
            if i + 3 < base.len() {
                let base_r = base[i] as f32;
                let base_g = base[i + 1] as f32;
                let base_b = base[i + 2] as f32;
                let base_a = base[i + 3] as f32 / 255.0;

                let overlay_r = overlay[i] as f32;
                let overlay_g = overlay[i + 1] as f32;
                let overlay_b = overlay[i + 2] as f32;
                let overlay_a = overlay[i + 3] as f32 / 255.0;

                let alpha = overlay_a + base_a * (1.0 - overlay_a);

                if alpha > 0.0 {
                    let r = (overlay_r * overlay_a + base_r * base_a * (1.0 - overlay_a)) / alpha;
                    let g = (overlay_g * overlay_a + base_g * base_a * (1.0 - overlay_a)) / alpha;
                    let b = (overlay_b * overlay_a + base_b * base_a * (1.0 - overlay_a)) / alpha;

                    output[i] = r.clamp(0.0, 255.0) as u8;
                    output[i + 1] = g.clamp(0.0, 255.0) as u8;
                    output[i + 2] = b.clamp(0.0, 255.0) as u8;
                    output[i + 3] = (alpha * 255.0).clamp(0.0, 255.0) as u8;
                } else {
                    output[i..i + 4].fill(0);
                }
            }
        }
    }
}

/// Memory-optimized image buffer with zero-copy operations
#[derive(Debug)]
pub struct OptimizedImageBuffer {
    data: Arc<Vec<u8>>,
    width: u32,
    height: u32,
    channels: u8,
}

impl OptimizedImageBuffer {
    /// Create a new optimized image buffer with pre-allocated memory
    pub fn new(width: u32, height: u32, channels: u8) -> Self {
        let size = (width * height * channels as u32) as usize;
        let mut data = Vec::with_capacity(size);
        data.resize(size, 0);

        Self {
            data: Arc::new(data),
            width,
            height,
            channels,
        }
    }

    /// Create from existing data with zero-copy
    pub fn from_vec(data: Vec<u8>, width: u32, height: u32, channels: u8) -> Result<Self> {
        let expected_size = (width * height * channels as u32) as usize;
        if data.len() != expected_size {
            return Err(CompressionError::MemoryError(format!(
                "Data size mismatch: expected {}, got {}",
                expected_size,
                data.len()
            )));
        }

        Ok(Self {
            data: Arc::new(data),
            width,
            height,
            channels,
        })
    }

    /// Get a reference to the underlying data
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// Get dimensions
    pub fn dimensions(&self) -> (u32, u32) {
        (self.width, self.height)
    }

    /// Get number of channels
    pub fn channels(&self) -> u8 {
        self.channels
    }

    /// Clone the buffer (shares underlying data via Arc)
    pub fn clone_shared(&self) -> Self {
        Self {
            data: Arc::clone(&self.data),
            width: self.width,
            height: self.height,
            channels: self.channels,
        }
    }

    /// Convert to DynamicImage with zero-copy when possible
    pub fn to_dynamic_image(&self) -> Result<DynamicImage> {
        match self.channels {
            1 => {
                let buffer = ImageBuffer::<image::Luma<u8>, Vec<u8>>::from_raw(
                    self.width,
                    self.height,
                    self.data.as_ref().clone(),
                )
                .ok_or_else(|| {
                    CompressionError::MemoryError(
                        "Failed to create grayscale image buffer".to_string(),
                    )
                })?;
                Ok(DynamicImage::ImageLuma8(buffer))
            }
            3 => {
                let buffer = ImageBuffer::<Rgb<u8>, Vec<u8>>::from_raw(
                    self.width,
                    self.height,
                    self.data.as_ref().clone(),
                )
                .ok_or_else(|| {
                    CompressionError::MemoryError("Failed to create RGB image buffer".to_string())
                })?;
                Ok(DynamicImage::ImageRgb8(buffer))
            }
            4 => {
                let buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
                    self.width,
                    self.height,
                    self.data.as_ref().clone(),
                )
                .ok_or_else(|| {
                    CompressionError::MemoryError("Failed to create RGBA image buffer".to_string())
                })?;
                Ok(DynamicImage::ImageRgba8(buffer))
            }
            _ => Err(CompressionError::UnsupportedFeature(format!(
                "Unsupported channel count: {}",
                self.channels
            ))),
        }
    }
}

/// Parallel processing utilities for batch operations
pub struct ParallelProcessor;

impl ParallelProcessor {
    /// Process multiple images in parallel with optimal thread utilization
    pub fn process_batch<F, T>(images: Vec<DynamicImage>, processor: F) -> Vec<Result<T>>
    where
        F: Fn(&DynamicImage) -> Result<T> + Send + Sync,
        T: Send,
    {
        // Determine optimal chunk size based on image sizes and CPU count
        let cpu_count = rayon::current_num_threads();
        let chunk_size = std::cmp::max(1, images.len() / (cpu_count * 2));

        images
            .par_chunks(chunk_size)
            .flat_map(|chunk| chunk.par_iter().map(&processor).collect::<Vec<_>>())
            .collect()
    }

    /// Parallel resize operation with memory optimization
    pub fn parallel_resize(
        images: Vec<DynamicImage>,
        target_width: u32,
        target_height: u32,
        filter: image::imageops::FilterType,
    ) -> Vec<DynamicImage> {
        images
            .into_par_iter()
            .map(|img| {
                // Use memory-efficient resize
                img.resize_exact(target_width, target_height, filter)
            })
            .collect()
    }

    /// Parallel color space conversion
    pub fn parallel_color_conversion<F>(
        images: Vec<DynamicImage>,
        converter: F,
    ) -> Vec<DynamicImage>
    where
        F: Fn(DynamicImage) -> DynamicImage + Send + Sync,
    {
        images.into_par_iter().map(converter).collect()
    }
}

/// Memory pool for efficient buffer reuse
pub struct MemoryPool {
    buffers: crossbeam_channel::Receiver<Vec<u8>>,
    buffer_sender: crossbeam_channel::Sender<Vec<u8>>,
    buffer_size: usize,
}

impl MemoryPool {
    /// Create a new memory pool with pre-allocated buffers
    pub fn new(buffer_size: usize, pool_size: usize) -> Self {
        let (sender, receiver) = crossbeam_channel::bounded(pool_size);

        // Pre-allocate buffers
        for _ in 0..pool_size {
            let buffer = vec![0u8; buffer_size];
            let _ = sender.try_send(buffer);
        }

        Self {
            buffers: receiver,
            buffer_sender: sender,
            buffer_size,
        }
    }

    /// Get a buffer from the pool or allocate a new one
    pub fn get_buffer(&self) -> Vec<u8> {
        self.buffers
            .try_recv()
            .unwrap_or_else(|_| vec![0u8; self.buffer_size])
    }

    /// Return a buffer to the pool
    pub fn return_buffer(&self, mut buffer: Vec<u8>) {
        if buffer.len() == self.buffer_size {
            buffer.clear();
            buffer.resize(self.buffer_size, 0);
            let _ = self.buffer_sender.try_send(buffer);
        }
        // If buffer size doesn't match, just drop it
    }
}

/// Zero-copy data transfer utilities
pub struct ZeroCopyTransfer;

impl ZeroCopyTransfer {
    /// Transfer image data without copying when formats are compatible
    pub fn transfer_compatible(source: &DynamicImage, target_format: &str) -> Option<Vec<u8>> {
        match (source, target_format) {
            (DynamicImage::ImageRgb8(img), "rgb") => Some(img.as_raw().clone()),
            (DynamicImage::ImageRgba8(img), "rgba") => Some(img.as_raw().clone()),
            (DynamicImage::ImageLuma8(img), "grayscale") => Some(img.as_raw().clone()),
            _ => None,
        }
    }

    /// Create a view into image data without copying
    pub fn create_view<T: Pod>(data: &[u8]) -> Result<&[T]> {
        if data.len() % std::mem::size_of::<T>() != 0 {
            return Err(CompressionError::MemoryError(
                "Data length not aligned for target type".to_string(),
            ));
        }

        Ok(cast_slice(data))
    }

    /// Create a mutable view into image data without copying
    pub fn create_view_mut<T: Pod>(data: &mut [u8]) -> Result<&mut [T]> {
        if data.len() % std::mem::size_of::<T>() != 0 {
            return Err(CompressionError::MemoryError(
                "Data length not aligned for target type".to_string(),
            ));
        }

        Ok(cast_slice_mut(data))
    }
}

// Marker traits for zero-copy operations

#[cfg(test)]
mod tests {
    use super::*;
    use image::{GenericImageView, ImageBuffer, Rgb, Rgba};

    #[test]
    fn test_simd_rgb_to_yuv_conversion() {
        let rgb_data = vec![255, 0, 0, 0, 255, 0, 0, 0, 255]; // Red, Green, Blue pixels
        let yuv_data = SimdProcessor::rgb_to_yuv_simd(&rgb_data);

        assert_eq!(yuv_data.len(), rgb_data.len());
        // Basic sanity check - converted data should be different
        assert_ne!(yuv_data, rgb_data);
    }

    #[test]
    fn test_simd_color_quantization() {
        let mut pixels = vec![0, 64, 128, 192, 255];
        SimdProcessor::quantize_colors_simd(&mut pixels, 4);

        // Should quantize to 4 levels: 0, 85, 170, 255
        for &pixel in &pixels {
            assert!(pixel == 0 || pixel == 85 || pixel == 170 || pixel == 255);
        }
    }

    #[test]
    fn test_optimized_image_buffer() {
        let buffer = OptimizedImageBuffer::new(100, 100, 3);
        assert_eq!(buffer.dimensions(), (100, 100));
        assert_eq!(buffer.channels(), 3);
        assert_eq!(buffer.data().len(), 30000);
    }

    #[test]
    fn test_memory_pool() {
        let pool = MemoryPool::new(1024, 4);
        let buffer1 = pool.get_buffer();
        let buffer2 = pool.get_buffer();

        assert_eq!(buffer1.len(), 1024);
        assert_eq!(buffer2.len(), 1024);

        pool.return_buffer(buffer1);
        let buffer3 = pool.get_buffer();
        assert_eq!(buffer3.len(), 1024);
    }

    #[test]
    fn test_parallel_processing() {
        let images = vec![
            DynamicImage::new_rgb8(10, 10),
            DynamicImage::new_rgb8(20, 20),
            DynamicImage::new_rgb8(30, 30),
        ];

        let results = ParallelProcessor::process_batch(images, |img| Ok(img.dimensions()));

        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|r| r.is_ok()));
    }

    #[test]
    fn test_zero_copy_transfer() {
        let img = ImageBuffer::<Rgb<u8>, Vec<u8>>::new(10, 10);
        let dynamic_img = DynamicImage::ImageRgb8(img);

        let transferred = ZeroCopyTransfer::transfer_compatible(&dynamic_img, "rgb");
        assert!(transferred.is_some());
        assert_eq!(transferred.unwrap().len(), 300); // 10*10*3
    }
}
