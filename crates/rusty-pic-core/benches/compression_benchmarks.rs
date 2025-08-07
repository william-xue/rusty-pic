use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rusty_pic_core::{compression::CompressionOptions, CompressionEngine, ImageAnalyzer};

fn create_test_image_data() -> Vec<u8> {
    // Create a simple 50x50 test image
    let img = image::RgbImage::from_fn(50, 50, |x, y| {
        let r = (x * 255 / 50) as u8;
        let g = (y * 255 / 50) as u8;
        let b = ((x + y) * 255 / 100) as u8;
        image::Rgb([r, g, b])
    });
    let dynamic_img = image::DynamicImage::ImageRgb8(img);

    let mut png_data = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut png_data),
            image::ImageFormat::Png,
        )
        .expect("Failed to encode test image");
    png_data
}

fn benchmark_image_analysis(c: &mut Criterion) {
    let analyzer = ImageAnalyzer::new();
    let test_data = create_test_image_data();

    c.bench_function("image_analysis", |b| {
        b.iter(|| analyzer.analyze(black_box(&test_data)).unwrap())
    });
}

fn benchmark_compression(c: &mut Criterion) {
    let engine = CompressionEngine::new();
    let test_data = create_test_image_data();
    let options = CompressionOptions {
        format: Some("png".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    c.bench_function("compression", |b| {
        b.iter(|| {
            engine
                .compress(black_box(&test_data), black_box(&options))
                .unwrap()
        })
    });
}

fn benchmark_different_qualities(c: &mut Criterion) {
    let engine = CompressionEngine::new();
    let test_data = create_test_image_data();

    let mut group = c.benchmark_group("compression_quality");

    for quality in [50, 75, 90].iter() {
        let options = CompressionOptions {
            format: Some("jpeg".to_string()),
            quality: Some(*quality),
            resize: None,
            optimize: None,
        };

        group.bench_with_input(format!("quality_{}", quality), quality, |b, _| {
            b.iter(|| {
                engine
                    .compress(black_box(&test_data), black_box(&options))
                    .unwrap()
            })
        });
    }
    group.finish();
}

criterion_group!(
    benches,
    benchmark_image_analysis,
    benchmark_compression,
    benchmark_different_qualities
);
criterion_main!(benches);
