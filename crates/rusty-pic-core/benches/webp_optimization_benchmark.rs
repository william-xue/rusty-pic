use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use image::{DynamicImage, ImageBuffer, Rgb, Rgba};
use rusty_pic_core::formats::webp::{encode, encode_optimized, encode_smart, WebPOptions};

fn create_test_image(width: u32, height: u32, complexity: &str) -> DynamicImage {
    match complexity {
        "simple" => {
            // Simple solid color image
            DynamicImage::ImageRgb8(ImageBuffer::from_fn(width, height, |_, _| {
                Rgb([128, 128, 128])
            }))
        }
        "gradient" => {
            // Gradient image
            DynamicImage::ImageRgb8(ImageBuffer::from_fn(width, height, |x, y| {
                let r = (x * 255 / width) as u8;
                let g = (y * 255 / height) as u8;
                let b = 128;
                Rgb([r, g, b])
            }))
        }
        "complex" => {
            // Complex pattern with high frequency details
            DynamicImage::ImageRgb8(ImageBuffer::from_fn(width, height, |x, y| {
                let r = ((x as f32 * 0.1).sin() * 127.0 + 128.0) as u8;
                let g = ((y as f32 * 0.1).cos() * 127.0 + 128.0) as u8;
                let b = (((x + y) as f32 * 0.05).sin() * 127.0 + 128.0) as u8;
                Rgb([r, g, b])
            }))
        }
        "transparency" => {
            // Image with transparency
            DynamicImage::ImageRgba8(ImageBuffer::from_fn(width, height, |x, y| {
                let alpha = if (x + y) % 2 == 0 { 255 } else { 128 };
                Rgba([255, 0, 0, alpha])
            }))
        }
        _ => {
            // Default to simple
            DynamicImage::ImageRgb8(ImageBuffer::from_fn(width, height, |_, _| {
                Rgb([128, 128, 128])
            }))
        }
    }
}

fn bench_webp_lossy_encoding(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_lossy_encoding");

    let sizes = [(100, 100), (500, 500), (1000, 1000)];
    let complexities = ["simple", "gradient", "complex"];

    for (width, height) in sizes {
        for complexity in complexities {
            let img = create_test_image(width, height, complexity);

            // Convert to PNG data for the simple encode function
            let mut png_data = Vec::new();
            {
                let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
                img.write_with_encoder(encoder).unwrap();
            }

            group.bench_with_input(
                BenchmarkId::new(
                    "simple_encode",
                    format!("{}x{}_{}", width, height, complexity),
                ),
                &png_data,
                |b, data| {
                    b.iter(|| encode(black_box(data), black_box(80), black_box(false)).unwrap())
                },
            );

            group.bench_with_input(
                BenchmarkId::new(
                    "optimized_encode",
                    format!("{}x{}_{}", width, height, complexity),
                ),
                &img,
                |b, image| {
                    let options = WebPOptions {
                        quality: 80.0,
                        lossless: false,
                        ..Default::default()
                    };
                    b.iter(|| encode_optimized(black_box(image), black_box(&options)).unwrap())
                },
            );
        }
    }

    group.finish();
}

fn bench_webp_lossless_encoding(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_lossless_encoding");

    let sizes = [(100, 100), (500, 500)]; // Smaller sizes for lossless as it's slower
    let complexities = ["simple", "gradient"];

    for (width, height) in sizes {
        for complexity in complexities {
            let img = create_test_image(width, height, complexity);

            // Convert to PNG data for the simple encode function
            let mut png_data = Vec::new();
            {
                let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
                img.write_with_encoder(encoder).unwrap();
            }

            group.bench_with_input(
                BenchmarkId::new(
                    "simple_lossless",
                    format!("{}x{}_{}", width, height, complexity),
                ),
                &png_data,
                |b, data| {
                    b.iter(|| encode(black_box(data), black_box(100), black_box(true)).unwrap())
                },
            );

            group.bench_with_input(
                BenchmarkId::new(
                    "optimized_lossless",
                    format!("{}x{}_{}", width, height, complexity),
                ),
                &img,
                |b, image| {
                    let options = WebPOptions {
                        quality: 100.0,
                        lossless: true,
                        method: 6, // Highest quality method for lossless
                        ..Default::default()
                    };
                    b.iter(|| encode_optimized(black_box(image), black_box(&options)).unwrap())
                },
            );
        }
    }

    group.finish();
}

fn bench_webp_smart_encoding(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_smart_encoding");

    let sizes = [(200, 200), (500, 500)];
    let complexities = ["simple", "gradient", "complex", "transparency"];

    for (width, height) in sizes {
        for complexity in complexities {
            let img = create_test_image(width, height, complexity);

            group.bench_with_input(
                BenchmarkId::new(
                    "smart_encode",
                    format!("{}x{}_{}", width, height, complexity),
                ),
                &img,
                |b, image| {
                    b.iter(|| {
                        encode_smart(black_box(image), black_box(80.0), black_box(true)).unwrap()
                    })
                },
            );
        }
    }

    group.finish();
}

fn bench_webp_quality_levels(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_quality_levels");

    let img = create_test_image(500, 500, "gradient");
    let qualities = [20.0, 50.0, 80.0, 95.0];

    for quality in qualities {
        group.bench_with_input(
            BenchmarkId::new("quality", quality as u32),
            &quality,
            |b, &q| {
                let options = WebPOptions {
                    quality: q,
                    lossless: false,
                    ..Default::default()
                };
                b.iter(|| encode_optimized(black_box(&img), black_box(&options)).unwrap())
            },
        );
    }

    group.finish();
}

fn bench_webp_compression_methods(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_compression_methods");

    let img = create_test_image(300, 300, "complex");

    for method in 0..=6 {
        group.bench_with_input(BenchmarkId::new("method", method), &method, |b, &m| {
            let options = WebPOptions {
                quality: 80.0,
                lossless: false,
                method: m,
                ..Default::default()
            };
            b.iter(|| encode_optimized(black_box(&img), black_box(&options)).unwrap())
        });
    }

    group.finish();
}

fn bench_webp_transparency_handling(c: &mut Criterion) {
    let mut group = c.benchmark_group("webp_transparency");

    let sizes = [(200, 200), (500, 500)];

    for (width, height) in sizes {
        let img_with_alpha = create_test_image(width, height, "transparency");
        let img_without_alpha = create_test_image(width, height, "gradient");

        group.bench_with_input(
            BenchmarkId::new("with_alpha", format!("{}x{}", width, height)),
            &img_with_alpha,
            |b, image| {
                let options = WebPOptions {
                    quality: 80.0,
                    lossless: false,
                    alpha_compression: true,
                    alpha_quality: 90,
                    ..Default::default()
                };
                b.iter(|| encode_optimized(black_box(image), black_box(&options)).unwrap())
            },
        );

        group.bench_with_input(
            BenchmarkId::new("without_alpha", format!("{}x{}", width, height)),
            &img_without_alpha,
            |b, image| {
                let options = WebPOptions {
                    quality: 80.0,
                    lossless: false,
                    ..Default::default()
                };
                b.iter(|| encode_optimized(black_box(image), black_box(&options)).unwrap())
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_webp_lossy_encoding,
    bench_webp_lossless_encoding,
    bench_webp_smart_encoding,
    bench_webp_quality_levels,
    bench_webp_compression_methods,
    bench_webp_transparency_handling
);
criterion_main!(benches);
