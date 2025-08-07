use rusty_pic_core::{
    formats::avif::{AvifColorSpace, AvifOptions, AvifSubsample},
    CompressionEngine, CompressionOptions,
};

#[test]
fn test_avif_basic_encoding() {
    // Create a simple test image (1x1 red pixel)
    let test_image_data = create_test_png();

    let result = rusty_pic_core::formats::avif::encode(&test_image_data, 80);
    assert!(result.is_ok());

    let compressed_data = result.unwrap();
    assert!(!compressed_data.is_empty());
}

#[test]
fn test_avif_options_default() {
    let options = AvifOptions::default();

    assert_eq!(options.quality, 80);
    assert_eq!(options.speed, 6);
    assert_eq!(options.alpha_quality, 80);
    assert_eq!(options.bit_depth, 8);
    assert!(!options.lossless);
    assert!(options.enable_sharp_yuv);
}

#[test]
fn test_avif_with_custom_options() {
    let test_image_data = create_test_png();

    let result = rusty_pic_core::formats::avif::encode_with_options(
        &test_image_data,
        90,    // quality
        4,     // speed
        false, // lossless
    );

    assert!(result.is_ok());
    let compressed_data = result.unwrap();
    assert!(!compressed_data.is_empty());
}

#[test]
fn test_avif_lossless_encoding() {
    let test_image_data = create_test_png();

    let result = rusty_pic_core::formats::avif::encode_with_options(
        &test_image_data,
        100,  // quality
        6,    // speed
        true, // lossless
    );

    assert!(result.is_ok());
    let compressed_data = result.unwrap();
    assert!(!compressed_data.is_empty());
}

#[test]
fn test_avif_color_space_options() {
    let options = AvifOptions {
        color_space: AvifColorSpace::Yuv420,
        subsample: AvifSubsample::Yuv420,
        ..Default::default()
    };

    // Test that options can be created with different color spaces
    assert!(matches!(options.color_space, AvifColorSpace::Yuv420));
    assert!(matches!(options.subsample, AvifSubsample::Yuv420));
}

#[test]
fn test_compression_engine_avif_integration() {
    let test_image_data = create_test_png();
    let engine = CompressionEngine::new();

    let options = CompressionOptions {
        format: Some("avif".to_string()),
        quality: Some(85),
        resize: None,
        optimize: None,
    };

    let result = engine.compress(&test_image_data, &options);
    assert!(result.is_ok());

    let compression_result = result.unwrap();
    assert_eq!(compression_result.format, "avif");
    assert!(!compression_result.data.is_empty());
    assert!(compression_result.compression_ratio > 0.0);
}

#[test]
fn test_avif_speed_quality_balance() {
    let test_image_data = create_test_png();

    // Test different speed settings
    for speed in [1, 4, 6, 8, 10] {
        let result =
            rusty_pic_core::formats::avif::encode_with_options(&test_image_data, 80, speed, false);

        assert!(result.is_ok(), "Failed with speed setting: {}", speed);
    }
}

#[test]
fn test_avif_with_alpha_channel() {
    let test_image_data = create_test_png_with_alpha();

    let result = rusty_pic_core::formats::avif::encode(&test_image_data, 80);
    assert!(result.is_ok());

    let compressed_data = result.unwrap();
    assert!(!compressed_data.is_empty());
}

// Helper functions to create test images
fn create_test_png() -> Vec<u8> {
    use image::{ImageBuffer, Rgb};

    // Create a simple 10x10 red image
    let img = ImageBuffer::from_fn(10, 10, |_x, _y| Rgb([255u8, 0u8, 0u8]));
    let dynamic_img = image::DynamicImage::ImageRgb8(img);

    let mut buffer = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut buffer),
            image::ImageFormat::Png,
        )
        .expect("Failed to create test PNG");

    buffer
}

fn create_test_png_with_alpha() -> Vec<u8> {
    use image::{ImageBuffer, Rgba};

    // Create a simple 10x10 red image with alpha
    let img = ImageBuffer::from_fn(10, 10, |_x, _y| Rgba([255u8, 0u8, 0u8, 128u8]));
    let dynamic_img = image::DynamicImage::ImageRgba8(img);

    let mut buffer = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut buffer),
            image::ImageFormat::Png,
        )
        .expect("Failed to create test PNG with alpha");

    buffer
}
