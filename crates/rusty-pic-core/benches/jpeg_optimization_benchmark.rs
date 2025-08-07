use criterion::{black_box, criterion_group, criterion_main, Criterion};
use image::{DynamicImage, ImageBuffer, Rgb};
use rusty_pic_core::formats::jpeg;

fn create_test_image(width: u32, height: u32) -> DynamicImage {
    let mut img_buffer = ImageBuffer::new(width, height);

    // Create a complex pattern for realistic benchmarking
    for (x, y, pixel) in img_buffer.enumerate_pixels_mut() {
        let r = ((x * 7 + y * 11) % 256) as u8;
        let g = ((x * 13 + y * 17) % 256) as u8;
        let b = ((x * 19 + y * 23) % 256) as u8;
        *pixel = Rgb([r, g, b]);
    }

    DynamicImage::ImageRgb8(img_buffer)
}

fn bench_jpeg_basic_vs_optimized(c: &mut Criterion) {
    let img = create_test_image(512, 512);

    let basic_options = jpeg::JpegOptions {
        quality: 80,
        progressive: false,
        optimize_coding: false,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Rgb,
        adaptive_quantization: false,
    };

    let optimized_options = jpeg::JpegOptions {
        quality: 80,
        progressive: true,
        optimize_coding: true,
        smoothing_factor: 0,
        color_space: jpeg::JpegColorSpace::Auto,
        adaptive_quantization: true,
    };

    c.bench_function("jpeg_basic", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&basic_options)).unwrap())
    });

    c.bench_function("jpeg_optimized", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&optimized_options)).unwrap())
    });
}

fn bench_color_space_conversion(c: &mut Criterion) {
    let img = create_test_image(256, 256);

    let rgb_options = jpeg::JpegOptions {
        quality: 80,
        color_space: jpeg::JpegColorSpace::Rgb,
        ..Default::default()
    };

    let ycbcr_options = jpeg::JpegOptions {
        quality: 80,
        color_space: jpeg::JpegColorSpace::YCbCr,
        ..Default::default()
    };

    c.bench_function("jpeg_rgb_colorspace", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&rgb_options)).unwrap())
    });

    c.bench_function("jpeg_ycbcr_colorspace", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&ycbcr_options)).unwrap())
    });
}

fn bench_progressive_vs_baseline(c: &mut Criterion) {
    let img = create_test_image(256, 256);

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

    c.bench_function("jpeg_baseline", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&baseline_options)).unwrap())
    });

    c.bench_function("jpeg_progressive", |b| {
        b.iter(|| jpeg::encode_optimized(black_box(&img), black_box(&progressive_options)).unwrap())
    });
}

criterion_group!(
    benches,
    bench_jpeg_basic_vs_optimized,
    bench_color_space_conversion,
    bench_progressive_vs_baseline
);
criterion_main!(benches);
