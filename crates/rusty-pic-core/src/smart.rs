//! Smart compression algorithms with advanced image analysis and iterative optimization

use crate::{
    CompressionEngine, CompressionError, CompressionOptions, CompressionResult, ImageAnalyzer,
    Result,
};
use image::{DynamicImage, GenericImageView};
use std::collections::HashMap;

/// Smart compression engine with advanced analysis and optimization
pub struct SmartCompressionEngine {
    analyzer: ImageAnalyzer,
    compression_engine: CompressionEngine,
    #[cfg(feature = "logging")]
    logger_enabled: bool,
}

impl SmartCompressionEngine {
    pub fn new() -> Self {
        Self {
            analyzer: ImageAnalyzer::new(),
            compression_engine: CompressionEngine::new(),
            #[cfg(feature = "logging")]
            logger_enabled: true,
        }
    }

    /// Perform smart compression with target size constraints
    pub fn smart_compress(
        &self,
        data: &[u8],
        constraints: &SmartCompressionConstraints,
    ) -> Result<CompressionResult> {
        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::info!("Starting smart compression with constraints: {constraints:?}");
        }

        // Load and analyze the image
        let img = image::load_from_memory(data)?;
        let analysis = self.analyzer.analyze(data)?;

        // Perform advanced complexity analysis
        let advanced_analysis = self.analyze_image_complexity(&img)?;

        // Select optimal format based on advanced analysis
        let optimal_format =
            self.select_optimal_format(&img, &analysis, &advanced_analysis, constraints)?;

        // If target size is specified, use iterative compression
        if let Some(target_size) = &constraints.target_size {
            self.iterative_compress_to_size(data, &optimal_format, target_size, constraints)
        } else {
            // Use standard compression with optimal settings
            let options =
                self.create_optimal_options(&optimal_format, &advanced_analysis, constraints)?;
            self.compression_engine.compress(data, &options)
        }
    }

    /// Analyze image complexity using advanced algorithms
    fn analyze_image_complexity(&self, img: &DynamicImage) -> Result<AdvancedImageAnalysis> {
        let (_width, _height) = img.dimensions();

        // Convert to grayscale for analysis
        let gray_img = img.to_luma8();

        // Edge detection using Sobel operator
        let edge_density = self.calculate_edge_density(&gray_img)?;

        // Texture analysis using Local Binary Patterns
        let texture_complexity = self.calculate_texture_complexity(&gray_img)?;

        // Color distribution analysis
        let color_analysis = self.analyze_color_distribution(img)?;

        // Frequency domain analysis
        let frequency_analysis = self.analyze_frequency_domain(&gray_img)?;

        // Calculate overall complexity score
        let overall_complexity = self.calculate_overall_complexity(
            edge_density,
            texture_complexity,
            color_analysis.color_variance,
            frequency_analysis.high_frequency_ratio,
        );

        Ok(AdvancedImageAnalysis {
            edge_density,
            texture_complexity,
            color_analysis,
            frequency_analysis,
            overall_complexity,
            perceptual_quality_score: self.calculate_perceptual_quality_score(img)?,
        })
    }

    /// Calculate edge density using Sobel operator
    fn calculate_edge_density(
        &self,
        gray_img: &image::ImageBuffer<image::Luma<u8>, Vec<u8>>,
    ) -> Result<f32> {
        let (width, height) = gray_img.dimensions();

        if width < 3 || height < 3 {
            return Ok(0.0);
        }

        let mut edge_count = 0u32;
        let mut total_pixels = 0u32;

        // Sobel kernels
        let sobel_x = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        let sobel_y = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let mut gx = 0i32;
                let mut gy = 0i32;

                // Apply Sobel kernels
                for ky in 0..3 {
                    for kx in 0..3 {
                        let pixel_val = gray_img.get_pixel(x + kx - 1, y + ky - 1)[0] as i32;
                        gx += sobel_x[ky as usize][kx as usize] * pixel_val;
                        gy += sobel_y[ky as usize][kx as usize] * pixel_val;
                    }
                }

                let gradient_magnitude = ((gx * gx + gy * gy) as f32).sqrt();

                if gradient_magnitude > 50.0 {
                    // Edge threshold
                    edge_count += 1;
                }
                total_pixels += 1;
            }
        }

        Ok(if total_pixels > 0 {
            edge_count as f32 / total_pixels as f32
        } else {
            0.0
        })
    }

    /// Calculate texture complexity using simplified Local Binary Patterns
    fn calculate_texture_complexity(
        &self,
        gray_img: &image::ImageBuffer<image::Luma<u8>, Vec<u8>>,
    ) -> Result<f32> {
        let (width, height) = gray_img.dimensions();

        if width < 3 || height < 3 {
            return Ok(0.0);
        }

        let mut lbp_histogram = HashMap::new();
        let mut total_patterns = 0u32;

        // Simplified 8-point LBP
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
        Ok(entropy / 8.0)
    }

    /// Analyze color distribution and variance
    fn analyze_color_distribution(&self, img: &DynamicImage) -> Result<ColorAnalysis> {
        let rgba_img = img.to_rgba8();
        let (width, height) = rgba_img.dimensions();
        let total_pixels = (width * height) as f32;

        let mut color_histogram = HashMap::new();
        let mut r_sum = 0u64;
        let mut g_sum = 0u64;
        let mut b_sum = 0u64;
        let mut unique_colors = 0u32;

        // Collect color statistics
        for pixel in rgba_img.pixels() {
            let color = (pixel[0], pixel[1], pixel[2]);

            r_sum += pixel[0] as u64;
            g_sum += pixel[1] as u64;
            b_sum += pixel[2] as u64;

            if !color_histogram.contains_key(&color) {
                unique_colors += 1;
            }
            *color_histogram.entry(color).or_insert(0) += 1;
        }

        // Calculate color variance
        let r_mean = r_sum as f32 / total_pixels;
        let g_mean = g_sum as f32 / total_pixels;
        let b_mean = b_sum as f32 / total_pixels;

        let mut r_variance = 0.0f32;
        let mut g_variance = 0.0f32;
        let mut b_variance = 0.0f32;

        for pixel in rgba_img.pixels() {
            r_variance += (pixel[0] as f32 - r_mean).powi(2);
            g_variance += (pixel[1] as f32 - g_mean).powi(2);
            b_variance += (pixel[2] as f32 - b_mean).powi(2);
        }

        r_variance /= total_pixels;
        g_variance /= total_pixels;
        b_variance /= total_pixels;

        let color_variance = (r_variance + g_variance + b_variance) / 3.0;

        // Calculate color diversity (normalized unique colors)
        let color_diversity = (unique_colors as f32 / total_pixels).min(1.0);

        Ok(ColorAnalysis {
            unique_colors,
            color_diversity,
            color_variance: color_variance / (255.0 * 255.0), // Normalize to 0-1
            dominant_colors: self.find_dominant_colors(&color_histogram),
        })
    }

    /// Find dominant colors in the image
    fn find_dominant_colors(
        &self,
        color_histogram: &HashMap<(u8, u8, u8), u32>,
    ) -> Vec<(u8, u8, u8)> {
        let mut colors: Vec<_> = color_histogram.iter().collect();
        colors.sort_by(|a, b| b.1.cmp(a.1));

        colors
            .into_iter()
            .take(5) // Top 5 dominant colors
            .map(|(color, _)| *color)
            .collect()
    }

    /// Analyze frequency domain characteristics
    fn analyze_frequency_domain(
        &self,
        gray_img: &image::ImageBuffer<image::Luma<u8>, Vec<u8>>,
    ) -> Result<FrequencyAnalysis> {
        let (width, height) = gray_img.dimensions();

        // Simplified frequency analysis using gradient magnitudes
        let mut _low_freq_energy = 0.0f32;
        let mut high_freq_energy = 0.0f32;
        let mut total_energy = 0.0f32;

        for y in 1..height - 1 {
            for x in 1..width - 1 {
                let _center = gray_img.get_pixel(x, y)[0] as f32;
                let left = gray_img.get_pixel(x - 1, y)[0] as f32;
                let right = gray_img.get_pixel(x + 1, y)[0] as f32;
                let top = gray_img.get_pixel(x, y - 1)[0] as f32;
                let bottom = gray_img.get_pixel(x, y + 1)[0] as f32;

                let horizontal_gradient = (right - left).abs();
                let vertical_gradient = (bottom - top).abs();
                let gradient_magnitude = (horizontal_gradient + vertical_gradient) / 2.0;

                total_energy += gradient_magnitude;

                if gradient_magnitude > 20.0 {
                    high_freq_energy += gradient_magnitude;
                } else {
                    _low_freq_energy += gradient_magnitude;
                }
            }
        }

        let high_frequency_ratio = if total_energy > 0.0 {
            high_freq_energy / total_energy
        } else {
            0.0
        };

        Ok(FrequencyAnalysis {
            high_frequency_ratio,
            low_frequency_ratio: 1.0 - high_frequency_ratio,
            total_energy,
        })
    }

    /// Calculate overall complexity score
    fn calculate_overall_complexity(
        &self,
        edge_density: f32,
        texture_complexity: f32,
        color_variance: f32,
        high_frequency_ratio: f32,
    ) -> f32 {
        // Weighted combination of different complexity measures
        let weights = [0.3, 0.25, 0.25, 0.2]; // edge, texture, color, frequency
        let values = [
            edge_density,
            texture_complexity,
            color_variance,
            high_frequency_ratio,
        ];

        weights
            .iter()
            .zip(values.iter())
            .map(|(w, v)| w * v)
            .sum::<f32>()
            .min(1.0)
    }

    /// Calculate perceptual quality score
    fn calculate_perceptual_quality_score(&self, img: &DynamicImage) -> Result<f32> {
        let (width, height) = img.dimensions();
        let pixel_count = width * height;

        // Base quality score based on resolution
        let resolution_score = if pixel_count > 2_000_000 {
            1.0
        } else if pixel_count > 1_000_000 {
            0.9
        } else if pixel_count > 500_000 {
            0.8
        } else {
            0.7
        };

        // Adjust based on aspect ratio (extreme ratios may indicate lower quality tolerance)
        let aspect_ratio = width as f32 / height as f32;
        let aspect_penalty = if !(0.33..=3.0).contains(&aspect_ratio) {
            0.9
        } else {
            1.0
        };

        Ok(resolution_score * aspect_penalty)
    }

    /// Select optimal format based on advanced analysis
    fn select_optimal_format(
        &self,
        img: &DynamicImage,
        basic_analysis: &crate::ImageAnalysis,
        advanced_analysis: &AdvancedImageAnalysis,
        constraints: &SmartCompressionConstraints,
    ) -> Result<String> {
        let (width, height) = img.dimensions();
        let pixel_count = width * height;
        let has_alpha = basic_analysis.has_alpha;

        // Consider user preferences
        if let Some(ref preferred_formats) = constraints.preferred_formats {
            for format in preferred_formats {
                if self.is_format_suitable(format, img, advanced_analysis) {
                    return Ok(format.clone());
                }
            }
        }

        // Advanced format selection logic
        let format = if has_alpha {
            if advanced_analysis.overall_complexity > 0.7 && pixel_count > 1_000_000 {
                "avif".to_string() // Best for complex images with alpha
            } else if advanced_analysis.texture_complexity > 0.6 {
                "webp".to_string() // Good for textured images with alpha
            } else if advanced_analysis.color_analysis.unique_colors < 256 {
                "png".to_string() // Optimal for low-color images with alpha
            } else {
                "webp".to_string() // Default for alpha images
            }
        } else {
            // No alpha channel
            if advanced_analysis.overall_complexity > 0.8 && pixel_count > 2_000_000 {
                "avif".to_string() // Best compression for very complex, large images
            } else if advanced_analysis.frequency_analysis.high_frequency_ratio > 0.6 {
                "jpeg".to_string() // Good for high-frequency content (photos)
            } else if advanced_analysis.edge_density > 0.4 {
                "webp".to_string() // Good balance for edge-heavy content
            } else if advanced_analysis.color_analysis.unique_colors < 256 {
                "png".to_string() // Optimal for low-color content
            } else if pixel_count > 1_500_000 {
                "avif".to_string() // AVIF for large images
            } else {
                "webp".to_string() // Default balanced choice
            }
        };

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::info!(
                "Selected format '{}' based on: complexity={:.3}, edges={:.3}, texture={:.3}, colors={}",
                format,
                advanced_analysis.overall_complexity,
                advanced_analysis.edge_density,
                advanced_analysis.texture_complexity,
                advanced_analysis.color_analysis.unique_colors
            );
        }

        Ok(format)
    }

    /// Check if a format is suitable for the given image
    fn is_format_suitable(
        &self,
        format: &str,
        img: &DynamicImage,
        analysis: &AdvancedImageAnalysis,
    ) -> bool {
        match format {
            "png" => {
                // PNG is suitable for images with low color count or high edge density
                analysis.color_analysis.unique_colors < 65536 || analysis.edge_density > 0.3
            }
            "jpeg" => {
                // JPEG is suitable for photographic content without alpha
                !img.color().has_alpha() && analysis.frequency_analysis.high_frequency_ratio > 0.3
            }
            "webp" => {
                // WebP is generally suitable for most content
                true
            }
            "avif" => {
                // AVIF is suitable for complex or large images
                analysis.overall_complexity > 0.4
                    || img.dimensions().0 * img.dimensions().1 > 500_000
            }
            _ => false,
        }
    }

    /// Create optimal compression options based on analysis
    fn create_optimal_options(
        &self,
        format: &str,
        analysis: &AdvancedImageAnalysis,
        constraints: &SmartCompressionConstraints,
    ) -> Result<CompressionOptions> {
        let quality = self.calculate_optimal_quality(format, analysis, constraints)?;

        Ok(CompressionOptions {
            format: Some(format.to_string()),
            quality: Some(quality),
            resize: constraints.resize.clone(),
            optimize: Some(crate::compression::OptimizeOptions {
                colors: analysis.color_analysis.unique_colors < 65536,
                progressive: analysis.overall_complexity > 0.5,
                lossless: constraints.min_quality.unwrap_or(0) >= 95,
            }),
        })
    }

    /// Calculate optimal quality based on analysis and constraints
    fn calculate_optimal_quality(
        &self,
        format: &str,
        analysis: &AdvancedImageAnalysis,
        constraints: &SmartCompressionConstraints,
    ) -> Result<u8> {
        let base_quality = match format {
            "jpeg" => {
                if analysis.frequency_analysis.high_frequency_ratio > 0.7 {
                    88 // High quality for detailed photos
                } else if analysis.overall_complexity > 0.6 {
                    82
                } else {
                    75
                }
            }
            "webp" => {
                if analysis.overall_complexity > 0.7 {
                    85
                } else if analysis.texture_complexity > 0.5 {
                    80
                } else {
                    75
                }
            }
            "avif" => {
                // AVIF can achieve better quality at higher settings
                if analysis.overall_complexity > 0.8 {
                    92
                } else if analysis.overall_complexity > 0.5 {
                    87
                } else {
                    82
                }
            }
            _ => 80,
        };

        // Apply perceptual quality adjustment
        let perceptual_adjustment = analysis.perceptual_quality_score;
        let adjusted_quality = (base_quality as f32 * perceptual_adjustment) as u8;

        // Respect minimum quality constraint
        let final_quality = if let Some(min_quality) = constraints.min_quality {
            adjusted_quality.max(min_quality)
        } else {
            adjusted_quality
        };

        Ok(final_quality.clamp(1, 100))
    }

    /// Iteratively compress to target file size
    fn iterative_compress_to_size(
        &self,
        data: &[u8],
        format: &str,
        target_size: &str,
        constraints: &SmartCompressionConstraints,
    ) -> Result<CompressionResult> {
        let target_bytes = self.parse_target_size(target_size)?;

        #[cfg(feature = "logging")]
        if self.logger_enabled {
            log::info!("Iterative compression target: {target_bytes} bytes");
        }

        let img = image::load_from_memory(data)?;
        let advanced_analysis = self.analyze_image_complexity(&img)?;

        // Start with high quality and iterate down
        let mut current_quality = constraints.min_quality.unwrap_or(95).min(95);
        let min_quality = constraints.min_quality.unwrap_or(30);
        let mut best_result: Option<CompressionResult> = None;
        let mut iterations = 0;
        const MAX_ITERATIONS: u8 = 10;

        while current_quality >= min_quality && iterations < MAX_ITERATIONS {
            let options = CompressionOptions {
                format: Some(format.to_string()),
                quality: Some(current_quality),
                resize: constraints.resize.clone(),
                optimize: Some(crate::compression::OptimizeOptions {
                    colors: advanced_analysis.color_analysis.unique_colors < 65536,
                    progressive: advanced_analysis.overall_complexity > 0.5,
                    lossless: current_quality >= 95,
                }),
            };

            match self.compression_engine.compress(data, &options) {
                Ok(result) => {
                    #[cfg(feature = "logging")]
                    if self.logger_enabled {
                        log::debug!(
                            "Iteration {}: quality={}, size={} bytes (target: {})",
                            iterations + 1,
                            current_quality,
                            result.compressed_size,
                            target_bytes
                        );
                    }

                    if result.compressed_size <= target_bytes {
                        // Found a result within target size
                        return Ok(result);
                    }

                    best_result = Some(result);
                }
                Err(e) => {
                    #[cfg(feature = "logging")]
                    if self.logger_enabled {
                        log::warn!("Compression failed at quality {current_quality}: {e}");
                    }
                    #[cfg(not(feature = "logging"))]
                    let _ = e; // Suppress unused variable warning when logging is disabled
                }
            }

            // Reduce quality for next iteration
            current_quality = (current_quality as f32 * 0.85) as u8;
            iterations += 1;
        }

        // If we couldn't reach target size, return the best result we got
        best_result.ok_or_else(|| {
            CompressionError::EncodingError(
                "Could not compress to target size within quality constraints".to_string(),
            )
        })
    }

    /// Parse target size string (e.g., "100kb", "1mb")
    pub fn parse_target_size(&self, target_size: &str) -> Result<usize> {
        let target_lower = target_size.to_lowercase();

        if let Some(kb_pos) = target_lower.find("kb") {
            let number_str = &target_lower[..kb_pos];
            let number: f32 = number_str.parse().map_err(|_| {
                CompressionError::InvalidFormat("Invalid target size format".to_string())
            })?;
            Ok((number * 1024.0) as usize)
        } else if let Some(mb_pos) = target_lower.find("mb") {
            let number_str = &target_lower[..mb_pos];
            let number: f32 = number_str.parse().map_err(|_| {
                CompressionError::InvalidFormat("Invalid target size format".to_string())
            })?;
            Ok((number * 1024.0 * 1024.0) as usize)
        } else {
            // Assume bytes
            target_size.parse().map_err(|_| {
                CompressionError::InvalidFormat("Invalid target size format".to_string())
            })
        }
    }
}

impl Default for SmartCompressionEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Constraints for smart compression
#[derive(Debug, Clone)]
pub struct SmartCompressionConstraints {
    pub target_size: Option<String>, // e.g., "100kb", "1mb"
    pub max_width: Option<u32>,
    pub max_height: Option<u32>,
    pub min_quality: Option<u8>,
    pub preferred_formats: Option<Vec<String>>,
    pub resize: Option<crate::compression::ResizeOptions>,
}

/// Advanced image analysis results
#[derive(Debug, Clone)]
pub struct AdvancedImageAnalysis {
    pub edge_density: f32,       // 0-1, density of edges
    pub texture_complexity: f32, // 0-1, texture complexity using LBP
    pub color_analysis: ColorAnalysis,
    pub frequency_analysis: FrequencyAnalysis,
    pub overall_complexity: f32,       // 0-1, weighted overall complexity
    pub perceptual_quality_score: f32, // 0-1, perceptual quality requirements
}

/// Color distribution analysis
#[derive(Debug, Clone)]
pub struct ColorAnalysis {
    pub unique_colors: u32,
    pub color_diversity: f32,               // 0-1, normalized unique colors
    pub color_variance: f32,                // 0-1, normalized color variance
    pub dominant_colors: Vec<(u8, u8, u8)>, // Top dominant colors
}

/// Frequency domain analysis
#[derive(Debug, Clone)]
pub struct FrequencyAnalysis {
    pub high_frequency_ratio: f32, // 0-1, ratio of high frequency content
    pub low_frequency_ratio: f32,  // 0-1, ratio of low frequency content
    pub total_energy: f32,         // Total frequency energy
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smart_compression_engine_new() {
        let engine = SmartCompressionEngine::new();
        assert!(std::ptr::addr_of!(engine) as *const _ != std::ptr::null());
    }

    #[test]
    fn test_parse_target_size() {
        let engine = SmartCompressionEngine::new();

        assert_eq!(engine.parse_target_size("100kb").unwrap(), 102400);
        assert_eq!(engine.parse_target_size("1mb").unwrap(), 1048576);
        assert_eq!(engine.parse_target_size("1024").unwrap(), 1024);
    }

    #[test]
    fn test_smart_compression_constraints() {
        let constraints = SmartCompressionConstraints {
            target_size: Some("100kb".to_string()),
            max_width: Some(1920),
            max_height: Some(1080),
            min_quality: Some(70),
            preferred_formats: Some(vec!["webp".to_string(), "avif".to_string()]),
            resize: None,
        };

        assert_eq!(constraints.target_size.as_ref().unwrap(), "100kb");
        assert_eq!(constraints.max_width.unwrap(), 1920);
        assert_eq!(constraints.min_quality.unwrap(), 70);
    }

    #[test]
    fn test_advanced_image_analysis_clone() {
        let color_analysis = ColorAnalysis {
            unique_colors: 1000,
            color_diversity: 0.5,
            color_variance: 0.3,
            dominant_colors: vec![(255, 0, 0), (0, 255, 0)],
        };

        let frequency_analysis = FrequencyAnalysis {
            high_frequency_ratio: 0.6,
            low_frequency_ratio: 0.4,
            total_energy: 1000.0,
        };

        let analysis = AdvancedImageAnalysis {
            edge_density: 0.4,
            texture_complexity: 0.6,
            color_analysis,
            frequency_analysis,
            overall_complexity: 0.5,
            perceptual_quality_score: 0.8,
        };

        let cloned = analysis.clone();
        assert_eq!(analysis.edge_density, cloned.edge_density);
        assert_eq!(analysis.texture_complexity, cloned.texture_complexity);
        assert_eq!(analysis.overall_complexity, cloned.overall_complexity);
    }
}
