use image::{DynamicImage, ImageBuffer, Rgb};
use rusty_pic_core::formats::jpeg;
use std::time::Instant;

fn create_test_image(width: u32, height: u32) -> DynamicImage {
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a complex pattern for realistic testing
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let r = ((x * 7 + y * 11) % 256) as u8;
        let g = ((x * 13 + y * 17) % 256) as u8;
        let b = ((x * 19 + y * 23) % 256) as u8;
        *pixel = Rgb([r, g, b]);
    }

    DynamicImage::ImageRgb8(img_buffer)
}

fn main() {
    println!("JPEG Optimization Demo");
    println!("======================");

    let img = create_test_image(512, 512);
    println!("Created test image: 512x512 pixels");

    // Test basic JPEG encoding
    let basic_options = jpeg::JpegOptions {
        quality: 80,
        progressive: false,
        optimize_coding: false,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Rgb,
        adaptive_quantization: false,
    };

    let start = Instant::now();
    let basic_result = jpeg::encode_optimized(&img, &basic_options).unwrap();
    let basic_time = start.elapsed();

    println!("\nBasic JPEG encoding:");
    println!("  Size: {} bytes", basic_result.len());
    println!("  Time: {:?}", basic_time);

    // Test optimized JPEG encoding
    let optimized_options = jpeg::JpegOptions {
        quality: 80,
        progressive: true,
        optimize_coding: true,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Auto,
        adaptive_quantization: true,
    };

    let start = Instant::now();
    let optimized_result = jpeg::encode_optimized(&img, &optimized_options).unwrap();
    let optimized_time = start.elapsed();

    println!("\nOptimized JPEG encoding:");
    println!("  Size: {} bytes", optimized_result.len());
    println!("  Time: {:?}", optimized_time);

    // Calculate improvements
    let size_reduction = (basic_result.len() as f32 - optimized_result.len() as f32)
        / basic_result.len() as f32
        * 100.0;
    println!("\nComparison:");
    println!("  Size reduction: {:.1}%", size_reduction);
    println!(
        "  Time difference: {:?}",
        optimized_time.saturating_sub(basic_time)
    );

    // Test different color spaces
    println!("\n--- Color Space Comparison ---");

    let color_spaces = [
        ("RGB", jpeg::JpegColorSpace::Rgb),
        ("YCbCr", jpeg::JpegColorSpace::YCbCr),
        ("Auto", jpeg::JpegColorSpace::Auto),
    ];

    for (name, color_space) in &color_spaces {
        let options = jpeg::JpegOptions {
            quality: 80,
            color_space: color_space.clone(),
            ..Default::default()
        };

        let start = Instant::now();
        let result = jpeg::encode_optimized(&img, &options).unwrap();
        let time = start.elapsed();

        println!("{} color space: {} bytes, {:?}", name, result.len(), time);
    }

    // Test progressive vs baseline
    println!("\n--- Progressive vs Baseline ---");

    let baseline_options = jpeg::JpegOptions {
        quality: 80,
        progressive: false,
        ..Default::default()
    };

    let progressive_options = jpeg::JpegOptions {
        quality: 80,
        progressive: true,
        ..Default::default()
    };

    let start = Instant::now();
    let baseline_result = jpeg::encode_optimized(&img, &baseline_options).unwrap();
    let baseline_time = start.elapsed();

    let start = Instant::now();
    let progressive_result = jpeg::encode_optimized(&img, &progressive_options).unwrap();
    let progressive_time = start.elapsed();

    println!(
        "Baseline JPEG: {} bytes, {:?}",
        baseline_result.len(),
        baseline_time
    );
    println!(
        "Progressive JPEG: {} bytes, {:?}",
        progressive_result.len(),
        progressive_time
    );

    println!("\nDemo completed successfully!");
}
