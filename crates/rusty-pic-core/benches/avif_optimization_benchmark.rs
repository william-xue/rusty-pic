use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rusty_pic_core::{
    formats::avif::{AvifColorSpace, AvifOptions},
    CompressionEngine, CompressionOptions,
};

fn create_test_image(width: u32, height: u32) -> Vec<u8> {
    use image::{ImageBuffer, Rgb};

    // Create a test image with some complexity
    let img = ImageBuffer::from_fn(width, height, |x, y| {
        let r = ((x * 255) / width) as u8;
        let g = ((y * 255) / height) as u8;
        let b = ((x + y) * 255 / (width + height)) as u8;
        Rgb([r, g, b])
    });

    let dynamic_img = image::DynamicImage::ImageRgb8(img);
    let mut buffer = Vec::new();
    dynamic_img
        .write_to(
            &mut std::io::Cursor::new(&mut buffer),
            image::ImageFormat::Png,
        )
        .expect("Failed to create test image");

    buffer
}

fn bench_avif_basic_encoding(c: &mut Criterion) {
    let test_data = create_test_image(512, 512);

    c.bench_function("avif_basic_encode_512x512", |b| {
        b.iter(|| rusty_pic_core::formats::avif::encode(black_box(&test_data), black_box(80)))
    });
}

fn bench_avif_quality_levels(c: &mut Criterion) {
    let test_data = create_test_image(256, 256);

    let mut group = c.benchmark_group("avif_quality_levels");

    for quality in [50, 70, 80, 90, 95].iter() {
        group.bench_with_input(format!("quality_{}", quality), quality, |b, &quality| {
            b.iter(|| {
                rusty_pic_core::formats::avif::encode(black_box(&test_data), black_box(quality))
            })
        });
    }

    group.finish();
}

fn bench_avif_speed_settings(c: &mut Criterion) {
    let test_data = create_test_image(256, 256);

    let mut group = c.benchmark_group("avif_speed_settings");

    for speed in [1, 4, 6, 8, 10].iter() {
        group.bench_with_input(format!("speed_{}", speed), speed, |b, &speed| {
            b.iter(|| {
                rusty_pic_core::formats::avif::encode_with_options(
                    black_box(&test_data),
                    black_box(80),
                    black_box(speed),
                    black_box(false),
                )
            })
        });
    }

    group.finish();
}

fn bench_avif_color_spaces(c: &mut Criterion) {
    let test_data = create_test_image(256, 256);
    let img = image::load_from_memory(&test_data).unwrap();

    let mut group = c.benchmark_group("avif_color_spaces");

    let color_spaces = [
        ("auto", AvifColorSpace::Auto),
        ("rgb", AvifColorSpace::Rgb),
        ("yuv420", AvifColorSpace::Yuv420),
        ("yuv422", AvifColorSpace::Yuv422),
        ("yuv444", AvifColorSpace::Yuv444),
    ];

    for (name, color_space) in color_spaces.iter() {
        group.bench_with_input(
            format!("colorspace_{}", name),
            color_space,
            |b, color_space| {
                b.iter(|| {
                    let options = AvifOptions {
                        color_space: color_space.clone(),
                        ..Default::default()
                    };
                    rusty_pic_core::formats::avif::encode_optimized(
                        black_box(&img),
                        black_box(&options),
                    )
                })
            },
        );
    }

    group.finish();
}

fn bench_avif_vs_other_formats(c: &mut Criterion) {
    let test_data = create_test_image(512, 512);
    let engine = CompressionEngine::new();

    let mut group = c.benchmark_group("format_comparison");

    let formats = ["jpeg", "png", "webp", "avif"];

    for format in formats.iter() {
        let options = CompressionOptions {
            format: Some(format.to_string()),
            quality: Some(80),
            resize: None,
            optimize: None,
        };

        group.bench_with_input(format!("format_{}", format), &options, |b, options| {
            b.iter(|| engine.compress(black_box(&test_data), black_box(options)))
        });
    }

    group.finish();
}

fn bench_avif_image_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("avif_image_sizes");

    let sizes = [(128, 128), (256, 256), (512, 512), (1024, 1024)];

    for (width, height) in sizes.iter() {
        let test_data = create_test_image(*width, *height);

        group.bench_with_input(
            format!("size_{}x{}", width, height),
            &test_data,
            |b, data| {
                b.iter(|| rusty_pic_core::formats::avif::encode(black_box(data), black_box(80)))
            },
        );
    }

    group.finish();
}

fn bench_avif_lossless_vs_lossy(c: &mut Criterion) {
    let test_data = create_test_image(256, 256);

    let mut group = c.benchmark_group("avif_lossless_vs_lossy");

    group.bench_function("lossy", |b| {
        b.iter(|| {
            rusty_pic_core::formats::avif::encode_with_options(
                black_box(&test_data),
                black_box(80),
                black_box(6),
                black_box(false),
            )
        })
    });

    group.bench_function("lossless", |b| {
        b.iter(|| {
            rusty_pic_core::formats::avif::encode_with_options(
                black_box(&test_data),
                black_box(100),
                black_box(6),
                black_box(true),
            )
        })
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_avif_basic_encoding,
    bench_avif_quality_levels,
    bench_avif_speed_settings,
    bench_avif_color_spaces,
    bench_avif_vs_other_formats,
    bench_avif_image_sizes,
    bench_avif_lossless_vs_lossy
);

criterion_main!(benches);
