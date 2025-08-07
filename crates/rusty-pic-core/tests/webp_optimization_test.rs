use image::{DynamicImage, ImageBuffer, Rgb, Rgba};
use rusty_pic_core::{
    compression::OptimizeOptions,
    formats::webp::{encode, encode_optimized, WebPOptions},
    CompressionEngine, CompressionOptions,
};

#[test]
fn test_webp_lossy_encoding() {
    // Create a test image
    let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(100, 100, |x, y| {
        Rgb([(x % 256) as u8, (y % 256) as u8, 128])
    }));

    // Convert to PNG data first
    let mut png_data = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
        img.write_with_encoder(encoder).unwrap();
    }

    // Test lossy WebP encoding
    let result = encode(&png_data, 80, false);
    assert!(result.is_ok());

    let webp_data = result.unwrap();
    assert!(!webp_data.is_empty());
    assert!(webp_data.len() < png_data.len()); // WebP should be smaller
}

#[test]
fn test_webp_lossless_encoding() {
    // Create a simple test image with few colors (good for lossless)
    let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(50, 50, |x, y| {
        if (x + y) % 2 == 0 {
            Rgb([255, 0, 0])
        } else {
            Rgb([0, 255, 0])
        }
    }));

    // Convert to PNG data first
    let mut png_data = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
        img.write_with_encoder(encoder).unwrap();
    }

    // Test lossless WebP encoding
    let result = encode(&png_data, 100, true);
    assert!(result.is_ok());

    let webp_data = result.unwrap();
    assert!(!webp_data.is_empty());
}

#[test]
fn test_webp_with_transparency() {
    // Create an image with transparency
    let img = DynamicImage::ImageRgba8(ImageBuffer::from_fn(50, 50, |x, y| {
        let alpha = if (x + y) % 2 == 0 { 255 } else { 128 };
        Rgba([255, 0, 0, alpha])
    }));

    let options = WebPOptions {
        quality: 80.0,
        lossless: false,
        alpha_compression: true,
        preserve_transparency: true,
    };

    let result = encode_optimized(&img, &options);
    assert!(result.is_ok());

    let webp_data = result.unwrap();
    assert!(!webp_data.is_empty());
}

#[test]
fn test_webp_options_validation() {
    let options = WebPOptions::default();

    // Test default values
    assert_eq!(options.quality, 80.0);
    assert!(!options.lossless);
    assert!(options.alpha_compression);
}

#[test]
fn test_webp_different_quality_levels() {
    let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(50, 50, |x, y| {
        Rgb([(x * 5) as u8, (y * 5) as u8, 128])
    }));

    // Test different quality levels - higher quality should generally produce larger files
    for quality in [20.0, 50.0, 80.0, 95.0] {
        let options = WebPOptions {
            quality,
            lossless: false,
            alpha_compression: true,
            preserve_transparency: true,
        };

        let result = encode_optimized(&img, &options);
        assert!(result.is_ok());

        let webp_data = result.unwrap();
        assert!(!webp_data.is_empty());
    }
}

#[test]
fn test_compression_engine_webp_integration() {
    // Test WebP compression through the main compression engine
    let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(100, 100, |x, y| {
        Rgb([(x % 256) as u8, (y % 256) as u8, 128])
    }));

    // Convert to PNG data first
    let mut png_data = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
        img.write_with_encoder(encoder).unwrap();
    }

    let engine = CompressionEngine::new();
    let options = CompressionOptions {
        format: Some("webp".to_string()),
        quality: Some(80),
        resize: None,
        optimize: Some(OptimizeOptions {
            colors: true,
            progressive: false,
            lossless: false,
        }),
    };

    let result = engine.compress(&png_data, &options);
    assert!(result.is_ok());

    let compression_result = result.unwrap();
    assert_eq!(compression_result.format, "webp");
    assert!(!compression_result.data.is_empty());
    assert!(compression_result.compressed_size > 0);
    assert!(compression_result.processing_time > 0);
}

#[test]
fn test_compression_engine_webp_lossless() {
    // Test lossless WebP compression through the main compression engine
    let img = DynamicImage::ImageRgb8(ImageBuffer::from_fn(50, 50, |x, y| {
        if (x + y) % 10 < 5 {
            Rgb([255, 0, 0])
        } else {
            Rgb([0, 255, 0])
        }
    }));

    // Convert to PNG data first
    let mut png_data = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
        img.write_with_encoder(encoder).unwrap();
    }

    let engine = CompressionEngine::new();
    let options = CompressionOptions {
        format: Some("webp".to_string()),
        quality: Some(100),
        resize: None,
        optimize: Some(OptimizeOptions {
            colors: true,
            progressive: false,
            lossless: true,
        }),
    };

    let result = engine.compress(&png_data, &options);
    assert!(result.is_ok());

    let compression_result = result.unwrap();
    assert_eq!(compression_result.format, "webp");
    assert!(!compression_result.data.is_empty());
}
