use criterion::{black_box, criterion_group, criterion_main, Criterion};
use image::{ImageBuffer, Rgb, Rgba};
use rusty_pic_core::formats::png::{encode_optimized, PngOptions};

fn create_test_image_rgb() -> image::DynamicImage {
    image::DynamicImage::ImageRgb8(ImageBuffer::from_fn(256, 256, |x, y| {
        Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8])
    }))
}

fn create_test_image_rgba() -> image::DynamicImage {
    image::DynamicImage::ImageRgba8(ImageBuffer::from_fn(256, 256, |x, y| {
        Rgba([
            (x % 256) as u8,
            (y % 256) as u8,
            ((x + y) % 256) as u8,
            if (x + y) % 4 == 0 { 128 } else { 255 }, // Some transparency
        ])
    }))
}

fn create_palette_image() -> image::DynamicImage {
    image::DynamicImage::ImageRgb8(ImageBuffer::from_fn(256, 256, |x, y| {
        // Only use 16 different colors
        let color_index = ((x / 16) + (y / 16)) % 16;
        match color_index {
            0 => Rgb([255, 0, 0]),      // Red
            1 => Rgb([0, 255, 0]),      // Green
            2 => Rgb([0, 0, 255]),      // Blue
            3 => Rgb([255, 255, 0]),    // Yellow
            4 => Rgb([255, 0, 255]),    // Magenta
            5 => Rgb([0, 255, 255]),    // Cyan
            6 => Rgb([255, 255, 255]),  // White
            7 => Rgb([0, 0, 0]),        // Black
            8 => Rgb([128, 0, 0]),      // Dark Red
            9 => Rgb([0, 128, 0]),      // Dark Green
            10 => Rgb([0, 0, 128]),     // Dark Blue
            11 => Rgb([128, 128, 0]),   // Olive
            12 => Rgb([128, 0, 128]),   // Purple
            13 => Rgb([0, 128, 128]),   // Teal
            14 => Rgb([128, 128, 128]), // Gray
            _ => Rgb([64, 64, 64]),     // Dark Gray
        }
    }))
}

fn benchmark_png_optimization_levels(c: &mut Criterion) {
    let img = create_test_image_rgb();

    let mut group = c.benchmark_group("png_optimization_levels");

    for level in [0, 2, 4, 6] {
        group.bench_with_input(format!("level_{}", level), &level, |b, &level| {
            let options = PngOptions {
                optimization_level: level,
                ..Default::default()
            };
            b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
        });
    }

    group.finish();
}

fn benchmark_png_features(c: &mut Criterion) {
    let img = create_test_image_rgba();

    let mut group = c.benchmark_group("png_features");

    // Baseline - no optimizations
    group.bench_function("baseline", |b| {
        let options = PngOptions {
            optimization_level: 0,
            palette_optimization: false,
            transparency_optimization: false,
            deflate_optimization: false,
            bit_depth_reduction: false,
            color_type_reduction: false,
            ..Default::default()
        };
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    // With transparency optimization
    group.bench_function("transparency_opt", |b| {
        let options = PngOptions {
            optimization_level: 2,
            transparency_optimization: true,
            ..Default::default()
        };
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    // With color type reduction
    group.bench_function("color_type_reduction", |b| {
        let options = PngOptions {
            optimization_level: 2,
            color_type_reduction: true,
            ..Default::default()
        };
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    // Full optimization
    group.bench_function("full_optimization", |b| {
        let options = PngOptions::default(); // All optimizations enabled
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    group.finish();
}

fn benchmark_png_palette_optimization(c: &mut Criterion) {
    let img = create_palette_image();

    let mut group = c.benchmark_group("png_palette");

    // Without palette optimization
    group.bench_function("no_palette_opt", |b| {
        let options = PngOptions {
            optimization_level: 2,
            palette_optimization: false,
            ..Default::default()
        };
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    // With palette optimization
    group.bench_function("with_palette_opt", |b| {
        let options = PngOptions {
            optimization_level: 2,
            palette_optimization: true,
            ..Default::default()
        };
        b.iter(|| black_box(encode_optimized(&img, &options).unwrap()))
    });

    group.finish();
}

fn benchmark_compression_ratio(c: &mut Criterion) {
    let img = create_test_image_rgb();

    // Encode with standard PNG encoder for comparison
    let mut standard_png = Vec::new();
    {
        let encoder = image::codecs::png::PngEncoder::new(&mut standard_png);
        img.write_with_encoder(encoder).unwrap();
    }

    // Encode with our optimized encoder
    let options = PngOptions::default();
    let optimized_png = encode_optimized(&img, &options).unwrap();

    let compression_ratio = optimized_png.len() as f64 / standard_png.len() as f64;

    println!("PNG Compression Results:");
    println!("Standard PNG size: {} bytes", standard_png.len());
    println!("Optimized PNG size: {} bytes", optimized_png.len());
    println!(
        "Compression ratio: {:.2}% of original",
        compression_ratio * 100.0
    );
    println!("Size reduction: {:.2}%", (1.0 - compression_ratio) * 100.0);

    c.bench_function("compression_comparison", |b| {
        b.iter(|| {
            let standard_size = black_box(standard_png.len());
            let optimized_size = black_box(optimized_png.len());
            black_box((standard_size, optimized_size))
        })
    });
}

criterion_group!(
    benches,
    benchmark_png_optimization_levels,
    benchmark_png_features,
    benchmark_png_palette_optimization,
    benchmark_compression_ratio
);
criterion_main!(benches);
