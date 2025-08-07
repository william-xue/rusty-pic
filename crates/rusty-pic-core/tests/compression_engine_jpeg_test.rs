use image::{DynamicImage, ImageBuffer, Rgb};
use rusty_pic_core::{compression::OptimizeOptions, CompressionEngine, CompressionOptions};

#[test]
fn test_compression_engine_uses_optimized_jpeg() {
    // Create a test image
    let width = 100;
    let height = 100;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a pattern
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let r = ((x + y) % 256) as u8;
        let g = ((x * 2 + y) % 256) as u8;
        let b = ((x + y * 2) % 256) as u8;
        *pixel = Rgb([r, g, b]);
    }

    let img = DynamicImage::ImageRgb8(img_buffer);
    let mut buffer = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buffer),
        image::ImageFormat::Png,
    )
    .unwrap();

    let engine = CompressionEngine::new();

    // Test JPEG compression with progressive enabled
    let options = CompressionOptions {
        format: Some("jpeg".to_string()),
        quality: Some(80),
        resize: None,
        optimize: Some(OptimizeOptions {
            colors: false,
            progressive: true,
            lossless: false,
        }),
    };

    let result = engine.compress(&buffer, &options).unwrap();

    // Verify the result
    assert!(!result.data.is_empty());
    assert_eq!(result.format, "jpeg");
    assert!(result.compressed_size > 0);
    assert!(result.compression_ratio > 0.0);
    assert!(result.processing_time > 0);

    // Check JPEG magic bytes
    assert_eq!(&result.data[0..2], &[0xFF, 0xD8]); // JPEG SOI marker

    println!("Original size: {} bytes", result.original_size);
    println!("Compressed size: {} bytes", result.compressed_size);
    println!(
        "Compression ratio: {:.2}%",
        result.compression_ratio * 100.0
    );
    println!("Processing time: {} ms", result.processing_time);
}

#[test]
fn test_compression_engine_jpeg_quality_levels() {
    // Create a test image
    let width = 64;
    let height = 64;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a gradient
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let intensity = ((x + y) * 255 / (width + height)) as u8;
        *pixel = Rgb([intensity, intensity, intensity]);
    }

    let img = DynamicImage::ImageRgb8(img_buffer);
    let mut buffer = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buffer),
        image::ImageFormat::Png,
    )
    .unwrap();

    let engine = CompressionEngine::new();

    // Test different quality levels
    let qualities = [30, 60, 90];
    let mut results = Vec::new();

    for quality in qualities {
        let options = CompressionOptions {
            format: Some("jpeg".to_string()),
            quality: Some(quality),
            resize: None,
            optimize: None,
        };

        let result = engine.compress(&buffer, &options).unwrap();
        results.push((quality, result.compressed_size));

        println!("Quality {}: {} bytes", quality, result.compressed_size);
    }

    // All results should be valid (non-zero sizes)
    for (quality, size) in &results {
        assert!(
            *size > 0,
            "Quality {} should produce non-zero size",
            quality
        );
    }

    // The compression should work for all quality levels
    assert_eq!(results.len(), 3);
}

#[test]
fn test_compression_engine_auto_format_selection() {
    // Create a test image
    let width = 50;
    let height = 50;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a simple pattern
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        if (x + y) % 2 == 0 {
            *pixel = Rgb([255, 255, 255]);
        } else {
            *pixel = Rgb([0, 0, 0]);
        }
    }

    let img = DynamicImage::ImageRgb8(img_buffer);
    let mut buffer = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut buffer),
        image::ImageFormat::Png,
    )
    .unwrap();

    let engine = CompressionEngine::new();

    // Test auto format selection
    let options = CompressionOptions {
        format: Some("auto".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    let result = engine.compress(&buffer, &options).unwrap();

    // Should select an appropriate format
    assert!(!result.data.is_empty());
    assert!(!result.format.is_empty());
    assert!(result.compressed_size > 0);

    println!("Auto-selected format: {}", result.format);
    println!("Compressed size: {} bytes", result.compressed_size);
}
