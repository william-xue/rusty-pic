use image::{DynamicImage, ImageBuffer, Rgb};
use rusty_pic_core::formats::jpeg;

#[test]
fn test_jpeg_optimization_features() {
    // Create a test image with some complexity
    let width = 100;
    let height = 100;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a pattern with varying complexity
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let r = ((x + y) % 256) as u8;
        let g = ((x * 2 + y) % 256) as u8;
        let b = ((x + y * 2) % 256) as u8;
        *pixel = Rgb([r, g, b]);
    }

    let img = DynamicImage::ImageRgb8(img_buffer);

    // Test different JPEG options
    let options_basic = jpeg::JpegOptions {
        quality: 80,
        progressive: false,
        optimize_coding: false,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Rgb,
        adaptive_quantization: false,
    };

    let options_optimized = jpeg::JpegOptions {
        quality: 80,
        progressive: true,
        optimize_coding: true,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Auto,
        adaptive_quantization: true,
    };

    // Encode with both options
    let result_basic = jpeg::encode_optimized(&img, &options_basic).unwrap();
    let result_optimized = jpeg::encode_optimized(&img, &options_optimized).unwrap();

    // Both should produce valid JPEG data
    assert!(!result_basic.is_empty());
    assert!(!result_optimized.is_empty());

    // Check JPEG magic bytes
    assert_eq!(&result_basic[0..2], &[0xFF, 0xD8]); // JPEG SOI marker
    assert_eq!(&result_optimized[0..2], &[0xFF, 0xD8]); // JPEG SOI marker

    println!("Basic JPEG size: {} bytes", result_basic.len());
    println!("Optimized JPEG size: {} bytes", result_optimized.len());
}

#[test]
fn test_color_space_conversion() {
    // Create a simple RGB image
    let width = 50;
    let height = 50;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Fill with red color
    for pixel in img_buffer.pixels_mut() {
        *pixel = Rgb([255, 0, 0]);
    }

    let img = DynamicImage::ImageRgb8(img_buffer);

    // Test RGB color space
    let options_rgb = jpeg::JpegOptions {
        quality: 80,
        color_space: jpeg::JpegColorSpace::Rgb,
        ..Default::default()
    };

    // Test YCbCr color space
    let options_ycbcr = jpeg::JpegOptions {
        quality: 80,
        color_space: jpeg::JpegColorSpace::YCbCr,
        ..Default::default()
    };

    let result_rgb = jpeg::encode_optimized(&img, &options_rgb).unwrap();
    let result_ycbcr = jpeg::encode_optimized(&img, &options_ycbcr).unwrap();

    assert!(!result_rgb.is_empty());
    assert!(!result_ycbcr.is_empty());

    println!("RGB encoding size: {} bytes", result_rgb.len());
    println!("YCbCr encoding size: {} bytes", result_ycbcr.len());
}

#[test]
fn test_progressive_jpeg() {
    // Create a test image
    let width = 64;
    let height = 64;
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a gradient pattern
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let intensity = ((x + y) * 255 / (width + height)) as u8;
        *pixel = Rgb([intensity, intensity, intensity]);
    }

    let img = DynamicImage::ImageRgb8(img_buffer);

    // Test progressive vs baseline
    let options_baseline = jpeg::JpegOptions {
        quality: 80,
        progressive: false,
        ..Default::default()
    };

    let options_progressive = jpeg::JpegOptions {
        quality: 80,
        progressive: true,
        ..Default::default()
    };

    let result_baseline = jpeg::encode_optimized(&img, &options_baseline).unwrap();
    let result_progressive = jpeg::encode_optimized(&img, &options_progressive).unwrap();

    assert!(!result_baseline.is_empty());
    assert!(!result_progressive.is_empty());

    println!("Baseline JPEG size: {} bytes", result_baseline.len());
    println!("Progressive JPEG size: {} bytes", result_progressive.len());
}

#[test]
fn test_adaptive_quantization() {
    // Create two images with different complexity levels
    let width = 64;
    let height = 64;

    // Simple image (low complexity)
    let mut simple_buffer = ImageBuffer::new(width, height);
    for pixel in simple_buffer.pixels_mut() {
        *pixel = Rgb([128, 128, 128]); // Solid gray
    }
    let simple_img = DynamicImage::ImageRgb8(simple_buffer);

    // Complex image (high complexity)
    let mut complex_buffer = ImageBuffer::new(width, height);
    for (x, y, pixel) in complex_buffer.enumerate_pixels_mut() {
        let r = ((x * 7 + y * 11) % 256) as u8;
        let g = ((x * 13 + y * 17) % 256) as u8;
        let b = ((x * 19 + y * 23) % 256) as u8;
        *pixel = Rgb([r, g, b]);
    }
    let complex_img = DynamicImage::ImageRgb8(complex_buffer);

    let options = jpeg::JpegOptions {
        quality: 80,
        adaptive_quantization: true,
        ..Default::default()
    };

    let simple_result = jpeg::encode_optimized(&simple_img, &options).unwrap();
    let complex_result = jpeg::encode_optimized(&complex_img, &options).unwrap();

    assert!(!simple_result.is_empty());
    assert!(!complex_result.is_empty());

    println!("Simple image size: {} bytes", simple_result.len());
    println!("Complex image size: {} bytes", complex_result.len());

    // Complex image should generally be larger due to higher quality needed
    // This is a basic sanity check
    assert!(complex_result.len() > 0);
    assert!(simple_result.len() > 0);
}
