//! Image analysis functionality

use crate::{performance::SimdProcessor, CompressionError, Result};
use image::{DynamicImage, GenericImageView, ImageFormat};
use rayon::prelude::*;
use std::collections::HashMap;

/// Analyzes images to determine optimal compression strategies
pub struct ImageAnalyzer {
    #[cfg(feature = "logging")]
    logger_enabled: bool,
}

impl ImageAnalyzer {
    pub fn new() -> Self {
        Self {
            #[cfg(feature = "logging")]
            logger_enabled: true,
        }
    }

    /// Analyze an image and provide compression recommendations
    pub fn analyze(&self, data: &[u8]) -> Result<ImageAnalysis> {
        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::debug!("Starting image analysis for {} bytes", data.len());
        }

        // Detect format and load image
        let format = self.detect_format(data)?;
        let img = image::load_from_memory(data)?;

        // Extract basic metadata
        let metadata = self.extract_metadata(&img, &format);

        // Analyze image characteristics
        let has_alpha = self.has_alpha_channel(&img);
        let color_count = self.estimate_color_count(&img);
        let complexity = self.calculate_complexity(&img);

        // Generate recommendations
        let (recommended_format, recommended_quality) =
            self.recommend_compression(&img, has_alpha, complexity);
        let estimated_savings =
            self.estimate_savings(&img, &recommended_format, recommended_quality);

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::info!(
                "Analysis complete: {}x{} {}, complexity: {:.2}, recommended: {} at quality {}",
                metadata.width,
                metadata.height,
                metadata.format,
                complexity,
                recommended_format,
                recommended_quality
            );
        }

        Ok(ImageAnalysis {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format.clone(),
            has_alpha,
            color_count,
            complexity,
            recommended_format,
            recommended_quality,
            estimated_savings,
            metadata,
        })
    }

    /// Detect image format from raw data
    fn detect_format(&self, data: &[u8]) -> Result<ImageFormat> {
        image::guess_format(data)
            .map_err(|e| CompressionError::InvalidFormat(format!("Could not detect format: {}", e)))
    }

    /// Extract basic metadata from image
    fn extract_metadata(&self, img: &DynamicImage, format: &ImageFormat) -> ImageMetadata {
        let (width, height) = img.dimensions();
        let color_type = img.color();
        let bit_depth = match color_type {
            image::ColorType::L8
            | image::ColorType::La8
            | image::ColorType::Rgb8
            | image::ColorType::Rgba8 => 8,
            image::ColorType::L16
            | image::ColorType::La16
            | image::ColorType::Rgb16
            | image::ColorType::Rgba16 => 16,
            _ => 8,
        };

        ImageMetadata {
            width,
            height,
            format: format_to_string(format),
            color_type: color_type_to_string(&color_type),
            bit_depth,
            has_transparency: matches!(
                color_type,
                image::ColorType::La8
                    | image::ColorType::La16
                    | image::ColorType::Rgba8
                    | image::ColorType::Rgba16
            ),
        }
    }

    /// Check if image has alpha channel
    fn has_alpha_channel(&self, img: &DynamicImage) -> bool {
        matches!(
            img.color(),
            image::ColorType::La8
                | image::ColorType::La16
                | image::ColorType::Rgba8
                | image::ColorType::Rgba16
        )
    }

    /// Estimate unique color count using parallel processing
    fn estimate_color_count(&self, img: &DynamicImage) -> u32 {
        let rgba_img = img.to_rgba8();
        let (width, height) = rgba_img.dimensions();
        let pixel_count = width * height;

        // For large images, use parallel sampling for better performance
        if pixel_count > 1_000_000 {
            self.estimate_color_count_parallel(&rgba_img)
        } else {
            self.estimate_color_count_sequential(&rgba_img)
        }
    }

    /// Parallel color counting for large images（无锁局部集合 + 归并）
    fn estimate_color_count_parallel(
        &self,
        img: &image::ImageBuffer<image::Rgba<u8>, Vec<u8>>,
    ) -> u32 {
        use std::collections::HashSet;

        let (width, height) = img.dimensions();
        // 动态采样步长：像素越多步长越大；上限限制集合规模
        let pixel_count = width as usize * height as usize;
        let target_samples = 50_000usize;
        let step = std::cmp::max(1, (pixel_count / target_samples).max(1));

        // 生成采样坐标
        let coordinates: Vec<(u32, u32)> = (0..width)
            .step_by(step)
            .flat_map(|x| (0..height).step_by(step).map(move |y| (x, y)))
            .collect();

        // 分片处理，每个分片使用局部 HashSet，避免全局锁
        let chunk_size = std::cmp::max(1024, coordinates.len() / (rayon::current_num_threads().max(1) * 2));
        let partial_sets: Vec<HashSet<(u8, u8, u8, u8)>> = coordinates
            .par_chunks(chunk_size)
            .map(|chunk| {
                let mut local: HashSet<(u8, u8, u8, u8)> = HashSet::with_capacity(chunk.len());
                for &(x, y) in chunk {
                    let p = img.get_pixel(x, y);
                    let c = (p[0], p[1], p[2], p[3]);
                    if local.len() < 65_536 {
                        local.insert(c);
                    } else {
                        break;
                    }
                }
                local
            })
            .collect();

        // 归并（顺序归并避免竞争；集合规模较小）
        let mut merged: HashSet<(u8, u8, u8, u8)> = HashSet::new();
        for set in partial_sets {
            if merged.len() >= 65_536 {
                break;
            }
            for c in set {
                merged.insert(c);
                if merged.len() >= 65_536 {
                    break;
                }
            }
        }

        merged.len() as u32
    }

    /// Sequential color counting for smaller images
    fn estimate_color_count_sequential(
        &self,
        img: &image::ImageBuffer<image::Rgba<u8>, Vec<u8>>,
    ) -> u32 {
        let mut color_map = HashMap::new();
        let (width, height) = img.dimensions();
        let step = std::cmp::max(1, (width * height) / 10000);

        for (x, y) in (0..width)
            .step_by(step as usize)
            .flat_map(|x| (0..height).step_by(step as usize).map(move |y| (x, y)))
        {
            let pixel = img.get_pixel(x, y);
            let color = (pixel[0], pixel[1], pixel[2], pixel[3]);

            if !color_map.contains_key(&color) {
                color_map.insert(color, true);

                if color_map.len() >= 65536 {
                    break;
                }
            }
        }

        color_map.len() as u32
    }

    /// Calculate image complexity (0.0 to 1.0) using SIMD-accelerated edge detection
    fn calculate_complexity(&self, img: &DynamicImage) -> f32 {
        let gray_img = img.to_luma8();
        let (width, height) = gray_img.dimensions();

        if width < 3 || height < 3 {
            return 0.0;
        }

        // Sobel 计算对每像素独立，使用并行遍历加速
        let edge_img = SimdProcessor::sobel_edge_detection_simd(&gray_img);

        // Count edge pixels in parallel
        let edge_count: u32 = edge_img
            .pixels()
            .par_bridge()
            .map(|pixel| if pixel[0] > 50 { 1u32 } else { 0u32 })
            .sum();

        let total_pixels = (width - 2) * (height - 2); // Exclude border pixels

        if total_pixels == 0 {
            0.0
        } else {
            (edge_count as f32 / total_pixels as f32).min(1.0)
        }
    }

    /// Calculate texture complexity using Local Binary Patterns
    pub fn calculate_texture_complexity(&self, img: &DynamicImage) -> f32 {
        let gray_img = img.to_luma8();
        let (width, height) = gray_img.dimensions();

        if width < 3 || height < 3 {
            return 0.0;
        }

        let mut lbp_histogram = HashMap::new();
        let mut total_patterns = 0u32;

        // 8-point Local Binary Pattern
        let offsets = [
            (-1, -1),
            (-1, 0),
            (-1, 1),
            (0, 1),
            (1, 1),
            (1, 0),
            (1, -1),
            (0, -1),
        ];

        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let center_val = gray_img.get_pixel(x, y)[0];
                let mut lbp_code = 0u8;

                for (i, (dx, dy)) in offsets.iter().enumerate() {
                    let neighbor_x = (x as i32 + dx) as u32;
                    let neighbor_y = (y as i32 + dy) as u32;
                    let neighbor_val = gray_img.get_pixel(neighbor_x, neighbor_y)[0];

                    if neighbor_val >= center_val {
                        lbp_code |= 1 << i;
                    }
                }

                *lbp_histogram.entry(lbp_code).or_insert(0) += 1;
                total_patterns += 1;
            }
        }

        // Calculate texture complexity as histogram entropy
        let mut entropy = 0.0f32;
        for &count in lbp_histogram.values() {
            if count > 0 {
                let probability = count as f32 / total_patterns as f32;
                entropy -= probability * probability.log2();
            }
        }

        // Normalize entropy (max entropy for 8-bit LBP is 8)
        (entropy / 8.0).min(1.0)
    }

    /// Calculate perceptual quality requirements based on image characteristics
    pub fn calculate_perceptual_quality_score(&self, img: &DynamicImage) -> f32 {
        let (width, height) = img.dimensions();
        let pixel_count = width * height;

        // Base quality score based on resolution
        let resolution_score = if pixel_count > 2_000_000 {
            1.0 // High resolution images need high quality
        } else if pixel_count > 1_000_000 {
            0.9
        } else if pixel_count > 500_000 {
            0.8
        } else {
            0.7 // Lower resolution can tolerate more compression
        };

        // Adjust based on aspect ratio
        let aspect_ratio = width as f32 / height as f32;
        let aspect_penalty = if aspect_ratio > 3.0 || aspect_ratio < 0.33 {
            0.9 // Extreme aspect ratios may be more tolerant to compression
        } else {
            1.0
        };

        // Consider color complexity
        let color_complexity = self.estimate_color_count(img) as f32 / 65536.0;
        let color_factor = 0.8 + (color_complexity * 0.2);

        (resolution_score * aspect_penalty * color_factor).min(1.0)
    }

    /// Recommend optimal compression format and quality using advanced analysis
    fn recommend_compression(
        &self,
        img: &DynamicImage,
        has_alpha: bool,
        complexity: f32,
    ) -> (String, u8) {
        let (width, height) = img.dimensions();
        let pixel_count = width * height;
        let color_count = self.estimate_color_count(img);
        let texture_complexity = self.calculate_texture_complexity(img);
        let perceptual_score = self.calculate_perceptual_quality_score(img);

        // Enhanced decision logic based on multiple image characteristics
        let format = if has_alpha {
            if complexity > 0.7 && texture_complexity > 0.6 && pixel_count > 1_000_000 {
                "avif".to_string() // AVIF for very complex images with alpha
            } else if complexity > 0.4 && pixel_count > 500_000 {
                "webp".to_string() // WebP for moderately complex images with alpha
            } else if color_count < 256 {
                "png".to_string() // PNG optimal for low-color images with alpha
            } else if texture_complexity > 0.5 {
                "webp".to_string() // WebP for textured images with alpha
            } else {
                "png".to_string() // PNG for simple images with alpha
            }
        } else {
            // No alpha channel - more format options available
            if complexity > 0.8 && pixel_count > 2_000_000 {
                "avif".to_string() // AVIF for very complex, large images
            } else if texture_complexity > 0.7 && complexity > 0.6 {
                "jpeg".to_string() // JPEG for highly textured photographic content
            } else if color_count < 256 && complexity < 0.3 {
                "png".to_string() // PNG for simple, low-color images
            } else if complexity > 0.5 && pixel_count > 1_000_000 {
                "avif".to_string() // AVIF for complex large images
            } else if complexity > 0.4 {
                "webp".to_string() // WebP for moderately complex images
            } else if pixel_count > 1_500_000 {
                "avif".to_string() // AVIF for large images regardless of complexity
            } else {
                "webp".to_string() // Default to WebP for balanced performance
            }
        };

        // Enhanced quality recommendation based on multiple factors
        let base_quality = match format.as_str() {
            "jpeg" => {
                if texture_complexity > 0.8 {
                    88 // High quality for very textured photos
                } else if complexity > 0.7 {
                    85
                } else if complexity > 0.4 {
                    80
                } else {
                    75
                }
            }
            "webp" => {
                if complexity > 0.7 && texture_complexity > 0.6 {
                    87 // High quality for complex textured content
                } else if complexity > 0.6 {
                    82
                } else if complexity > 0.3 {
                    78
                } else {
                    75
                }
            }
            "avif" => {
                // AVIF can achieve excellent compression at higher qualities
                if complexity > 0.8 {
                    92 // Very high quality for very complex images
                } else if complexity > 0.6 {
                    88
                } else if complexity > 0.4 {
                    85
                } else {
                    82
                }
            }
            "png" => {
                100 // PNG is lossless, quality doesn't apply the same way
            }
            _ => 80, // Default quality
        };

        // Apply perceptual quality adjustment
        let adjusted_quality = if format != "png" {
            let perceptual_adjustment = 0.85 + (perceptual_score * 0.15);
            ((base_quality as f32 * perceptual_adjustment) as u8)
                .min(100)
                .max(50)
        } else {
            base_quality
        };

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::debug!(
                "Format recommendation: {} at quality {} (complexity: {:.3}, texture: {:.3}, colors: {}, perceptual: {:.3})",
                format, adjusted_quality, complexity, texture_complexity, color_count, perceptual_score
            );
        }

        (format, adjusted_quality)
    }

    /// Estimate potential file size savings
    fn estimate_savings(&self, img: &DynamicImage, format: &str, quality: u8) -> f32 {
        let (width, height) = img.dimensions();
        let pixel_count = width * height;
        let bytes_per_pixel = match img.color() {
            image::ColorType::L8 => 1,
            image::ColorType::La8 => 2,
            image::ColorType::Rgb8 => 3,
            image::ColorType::Rgba8 => 4,
            image::ColorType::L16 => 2,
            image::ColorType::La16 => 4,
            image::ColorType::Rgb16 => 6,
            image::ColorType::Rgba16 => 8,
            _ => 4,
        };

        let _uncompressed_size = pixel_count * bytes_per_pixel;

        // Rough estimation based on format and quality
        let compression_ratio = match format {
            "jpeg" => {
                let base_ratio = match quality {
                    q if q >= 90 => 0.15,
                    q if q >= 80 => 0.10,
                    q if q >= 70 => 0.08,
                    _ => 0.06,
                };
                base_ratio
            }
            "webp" => {
                let base_ratio = match quality {
                    q if q >= 90 => 0.12,
                    q if q >= 80 => 0.08,
                    q if q >= 70 => 0.06,
                    _ => 0.04,
                };
                base_ratio
            }
            "avif" => {
                // AVIF typically achieves better compression than WebP
                let base_ratio = match quality {
                    q if q >= 90 => 0.08,
                    q if q >= 80 => 0.05,
                    q if q >= 70 => 0.04,
                    _ => 0.03,
                };
                base_ratio
            }
            "png" => 0.25, // PNG compression varies widely
            _ => 0.15,
        };

        1.0 - compression_ratio
    }
}

impl Default for ImageAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

// Helper functions
fn format_to_string(format: &ImageFormat) -> String {
    match format {
        ImageFormat::Png => "png".to_string(),
        ImageFormat::Jpeg => "jpeg".to_string(),
        ImageFormat::WebP => "webp".to_string(),
        ImageFormat::Gif => "gif".to_string(),
        ImageFormat::Bmp => "bmp".to_string(),
        ImageFormat::Tiff => "tiff".to_string(),
        _ => "unknown".to_string(),
    }
}

fn color_type_to_string(color_type: &image::ColorType) -> String {
    match color_type {
        image::ColorType::L8 => "grayscale".to_string(),
        image::ColorType::La8 => "grayscale+alpha".to_string(),
        image::ColorType::Rgb8 => "rgb".to_string(),
        image::ColorType::Rgba8 => "rgba".to_string(),
        image::ColorType::L16 => "grayscale16".to_string(),
        image::ColorType::La16 => "grayscale16+alpha".to_string(),
        image::ColorType::Rgb16 => "rgb16".to_string(),
        image::ColorType::Rgba16 => "rgba16".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Results of image analysis
#[derive(Debug, Clone)]
pub struct ImageAnalysis {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub has_alpha: bool,
    pub color_count: u32,
    pub complexity: f32, // 0-1 scale
    pub recommended_format: String,
    pub recommended_quality: u8,
    pub estimated_savings: f32,
    pub metadata: ImageMetadata,
}

/// Detailed image metadata
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub color_type: String,
    pub bit_depth: u8,
    pub has_transparency: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyzer_new() {
        let analyzer = ImageAnalyzer::new();
        // Test that analyzer can be created
        assert!(std::ptr::addr_of!(analyzer) as *const _ != std::ptr::null());
    }

    #[test]
    fn test_analyze_empty_data() {
        let analyzer = ImageAnalyzer::new();
        let result = analyzer.analyze(&[]);

        // Should return an error for empty data
        assert!(result.is_err());
    }

    #[test]
    fn test_image_analysis_clone() {
        let metadata = ImageMetadata {
            width: 100,
            height: 200,
            format: "png".to_string(),
            color_type: "rgba".to_string(),
            bit_depth: 8,
            has_transparency: true,
        };

        let analysis = ImageAnalysis {
            width: 100,
            height: 200,
            format: "png".to_string(),
            has_alpha: true,
            color_count: 256,
            complexity: 0.5,
            recommended_format: "webp".to_string(),
            recommended_quality: 80,
            estimated_savings: 0.3,
            metadata,
        };

        let cloned = analysis.clone();
        assert_eq!(analysis.width, cloned.width);
        assert_eq!(analysis.height, cloned.height);
        assert_eq!(analysis.format, cloned.format);
    }
}
