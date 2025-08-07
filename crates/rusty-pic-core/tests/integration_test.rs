//! Integration tests for rusty-pic-core

use image::GenericImageView;
use rusty_pic_core::{CompressionEngine, CompressionOptions, ImageAnalyzer};

#[test]
fn test_analyze_and_compress_simple_image() {
    // Create a simple 10x10 red image
    let img = image::RgbImage::from_fn(10, 10, |_x, _y| image::Rgb([255, 0, 0]));
    let dynamic_img = image::DynamicImage::ImageRgb8(img);

    // Encode to PNG for testing
    let mut png_data = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut png_data),
            image::ImageFormat::Png,
        )
        .expect("Failed to encode test image");

    // Test analysis
    let analyzer = ImageAnalyzer::new();
    let analysis = analyzer
        .analyze(&png_data)
        .expect("Analysis should succeed");

    assert_eq!(analysis.width, 10);
    assert_eq!(analysis.height, 10);
    assert_eq!(analysis.format, "png");
    assert!(!analysis.has_alpha);
    assert!(analysis.complexity >= 0.0 && analysis.complexity <= 1.0);

    // Test compression
    let engine = CompressionEngine::new();
    let options = CompressionOptions {
        format: Some("png".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    let result = engine
        .compress(&png_data, &options)
        .expect("Compression should succeed");

    assert!(!result.data.is_empty());
    assert_eq!(result.format, "png");
    // Processing time should be recorded (u64 is always >= 0)
    assert_eq!(result.original_size, png_data.len());
    assert!(result.compressed_size > 0);
}

#[test]
fn test_resize_functionality() {
    // Create a simple 20x20 image
    let img = image::RgbImage::from_fn(20, 20, |x, y| {
        if (x + y) % 2 == 0 {
            image::Rgb([255, 255, 255])
        } else {
            image::Rgb([0, 0, 0])
        }
    });
    let dynamic_img = image::DynamicImage::ImageRgb8(img);

    let mut png_data = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut png_data),
            image::ImageFormat::Png,
        )
        .expect("Failed to encode test image");

    let engine = CompressionEngine::new();
    let options = CompressionOptions {
        format: Some("png".to_string()),
        quality: Some(80),
        resize: Some(rusty_pic_core::compression::ResizeOptions {
            width: Some(10),
            height: Some(10),
            fit: "fill".to_string(),
        }),
        optimize: None,
    };

    let result = engine
        .compress(&png_data, &options)
        .expect("Compression with resize should succeed");

    assert!(!result.data.is_empty());
    assert_eq!(result.format, "png");

    // Verify the resized image dimensions by loading the result
    let resized_img =
        image::load_from_memory(&result.data).expect("Should be able to load compressed image");
    assert_eq!(resized_img.dimensions(), (10, 10));
}

#[test]
fn test_auto_format_selection() {
    // Create a simple image
    let img = image::RgbImage::from_fn(10, 10, |_x, _y| image::Rgb([128, 128, 128]));
    let dynamic_img = image::DynamicImage::ImageRgb8(img);

    let mut png_data = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut png_data),
            image::ImageFormat::Png,
        )
        .expect("Failed to encode test image");

    let engine = CompressionEngine::new();
    let options = CompressionOptions {
        format: Some("auto".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    let result = engine
        .compress(&png_data, &options)
        .expect("Auto format compression should succeed");

    assert!(!result.data.is_empty());
    // Should select png as recommended format for this simple, low-color image
    assert_eq!(result.format, "png");
}
