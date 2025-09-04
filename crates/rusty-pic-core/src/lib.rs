//! Core image compression algorithms for rusty-pic
//!
//! This crate provides the fundamental image processing and compression
//! functionality that will be used by the WASM bindings and other components.

pub mod analyzer;
pub mod compression;
pub mod performance;
pub mod smart;
// Use file-based formats.rs only; ensure no directory module conflict
#[path = "formats.rs"]
pub mod formats;

pub use analyzer::{ImageAnalysis, ImageAnalyzer, ImageMetadata};
pub use compression::{CompressionEngine, CompressionOptions, CompressionResult};
// AVIF support will be added in future versions
// #[cfg(feature = "avif")]
// pub use formats::avif::{AvifColorSpace, AvifOptions, AvifSubsample};
// JPEG support will be added in future versions
// #[cfg(feature = "jpeg")]
// pub use formats::jpeg::{JpegColorSpace, JpegOptions};
pub use formats::png::PngOptions;
// WebP support will be added in future versions
// #[cfg(feature = "webp")]
// pub use formats::webp::WebPOptions;
pub use performance::{
    MemoryPool, OptimizedImageBuffer, ParallelProcessor, SimdProcessor, ZeroCopyTransfer,
};
pub use smart::{
    AdvancedImageAnalysis, ColorAnalysis, FrequencyAnalysis, SmartCompressionConstraints,
    SmartCompressionEngine,
};

/// Core error types for the compression engine
#[derive(thiserror::Error, Debug)]
pub enum CompressionError {
    #[error("Invalid image format: {0}")]
    InvalidFormat(String),

    #[error("Unsupported feature: {0}")]
    UnsupportedFeature(String),

    #[error("Memory allocation error: {0}")]
    MemoryError(String),

    #[error("Encoding error: {0}")]
    EncodingError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    ImageError(#[from] image::ImageError),

    #[error("Analysis error: {0}")]
    AnalysisError(String),
}

pub type Result<T> = std::result::Result<T, CompressionError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = CompressionError::InvalidFormat("test".to_string());
        assert!(error.to_string().contains("Invalid image format"));
    }

    #[test]
    fn test_analyzer_creation() {
        let analyzer = ImageAnalyzer::new();
        // Test that analyzer can be created without panicking
        assert!(std::ptr::addr_of!(analyzer) as *const _ != std::ptr::null());
    }

    #[test]
    fn test_compression_engine_creation() {
        let engine = CompressionEngine::new();
        // Test that engine can be created without panicking
        assert!(std::ptr::addr_of!(engine) as *const _ != std::ptr::null());
    }
}
/// Example usage of the smart compression functionality
#[cfg(test)]
mod smart_compression_examples {
    use super::*;

    #[test]
    fn example_smart_compression_usage() {
        // This example shows how to use the smart compression engine
        // Note: This test doesn't run actual compression due to lack of real image data

        let engine = SmartCompressionEngine::new();

        // Example 1: Basic smart compression constraints
        let basic_constraints = SmartCompressionConstraints {
            target_size: Some("100kb".to_string()),
            max_width: Some(1920),
            max_height: Some(1080),
            min_quality: Some(70),
            preferred_formats: Some(vec!["webp".to_string(), "avif".to_string()]),
            resize: None,
        };

        // Example 2: Smart compression with resize
        let resize_constraints = SmartCompressionConstraints {
            target_size: Some("50kb".to_string()),
            max_width: None,
            max_height: None,
            min_quality: Some(60),
            preferred_formats: None, // Let the engine decide
            resize: Some(compression::ResizeOptions {
                width: Some(800),
                height: Some(600),
                fit: "contain".to_string(),
            }),
        };

        // Verify constraints are properly constructed
        assert_eq!(basic_constraints.target_size.as_ref().unwrap(), "100kb");
        assert_eq!(
            resize_constraints.resize.as_ref().unwrap().width.unwrap(),
            800
        );

        // Example of parsing target sizes
        assert_eq!(engine.parse_target_size("100kb").unwrap(), 102400);
        assert_eq!(engine.parse_target_size("1mb").unwrap(), 1048576);
    }
}
