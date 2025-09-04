use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use image::GenericImageView;
use image::{DynamicImage, ImageBuffer, Rgb, Rgba};
use rusty_pic_core::{
    performance::{MemoryPool, OptimizedImageBuffer, ParallelProcessor, SimdProcessor},
    CompressionEngine, CompressionOptions,
};

fn create_test_image(width: u32, height: u32, channels: u8) -> DynamicImage {
    match channels {
        3 => {
            let buffer = ImageBuffer::<Rgb<u8>, Vec<u8>>::from_fn(width, height, |x, y| {
                Rgb([
                    ((x + y) % 256) as u8,
                    ((x * 2 + y) % 256) as u8,
                    ((x + y * 2) % 256) as u8,
                ])
            });
            DynamicImage::ImageRgb8(buffer)
        }
        4 => {
            let buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_fn(width, height, |x, y| {
                Rgba([
                    ((x + y) % 256) as u8,
                    ((x * 2 + y) % 256) as u8,
                    ((x + y * 2) % 256) as u8,
                    255,
                ])
            });
            DynamicImage::ImageRgba8(buffer)
        }
        _ => panic!("Unsupported channel count"),
    }
}

fn bench_simd_color_conversion(c: &mut Criterion) {
    let mut group = c.benchmark_group("simd_color_conversion");

    for size in [256, 512, 1024, 2048].iter() {
        let pixel_count = size * size * 3;
        group.throughput(Throughput::Bytes(pixel_count as u64));

        let rgb_data: Vec<u8> = (0..pixel_count).map(|i| (i % 256) as u8).collect();

        group.bench_with_input(BenchmarkId::new("rgb_to_yuv_simd", size), size, |b, _| {
            b.iter(|| {
                let result = SimdProcessor::rgb_to_yuv_simd(black_box(&rgb_data));
                black_box(result);
            });
        });

        group.bench_with_input(BenchmarkId::new("rgb_to_yuv_scalar", size), size, |b, _| {
            b.iter(|| {
                let mut yuv_data = vec![0u8; rgb_data.len()];
                // Scalar implementation for comparison
                for i in (0..rgb_data.len()).step_by(3) {
                    if i + 2 < rgb_data.len() {
                        let r = rgb_data[i] as f32;
                        let g = rgb_data[i + 1] as f32;
                        let b = rgb_data[i + 2] as f32;

                        let y = 0.299 * r + 0.587 * g + 0.114 * b;
                        let u = -0.169 * r - 0.331 * g + 0.5 * b + 128.0;
                        let v = 0.5 * r - 0.419 * g - 0.081 * b + 128.0;

                        yuv_data[i] = y.clamp(0.0, 255.0) as u8;
                        yuv_data[i + 1] = u.clamp(0.0, 255.0) as u8;
                        yuv_data[i + 2] = v.clamp(0.0, 255.0) as u8;
                    }
                }
                black_box(yuv_data);
            });
        });
    }

    group.finish();
}

fn bench_simd_quantization(c: &mut Criterion) {
    let mut group = c.benchmark_group("simd_quantization");

    for size in [256, 512, 1024, 2048].iter() {
        let pixel_count = size * size * 3;
        group.throughput(Throughput::Bytes(pixel_count as u64));

        let pixels: Vec<u8> = (0..pixel_count).map(|i| (i % 256) as u8).collect();

        group.bench_with_input(BenchmarkId::new("quantize_simd", size), size, |b, _| {
            b.iter(|| {
                let mut data = pixels.clone();
                SimdProcessor::quantize_colors_simd(black_box(&mut data), 64);
                black_box(data);
            });
        });

        group.bench_with_input(BenchmarkId::new("quantize_scalar", size), size, |b, _| {
            b.iter(|| {
                let mut data = pixels.clone();
                let scale = 255.0 / 63.0; // 64 levels - 1
                let inv_scale = 1.0 / scale;

                for pixel in &mut data {
                    let normalized = (*pixel as f32) * inv_scale;
                    let quantized = normalized.round() * scale;
                    *pixel = quantized.clamp(0.0, 255.0) as u8;
                }
                black_box(data);
            });
        });
    }

    group.finish();
}

fn bench_parallel_processing(c: &mut Criterion) {
    let mut group = c.benchmark_group("parallel_processing");

    for image_count in [4, 8, 16, 32].iter() {
        group.bench_with_input(
            BenchmarkId::new("parallel_batch", image_count),
            image_count,
            |b, &count| {
                let images: Vec<DynamicImage> =
                    (0..count).map(|_| create_test_image(512, 512, 3)).collect();

                b.iter(|| {
                    let results =
                        ParallelProcessor::process_batch(black_box(images.clone()), |img| {
                            Ok(img.dimensions())
                        });
                    black_box(results);
                });
            },
        );

        group.bench_with_input(
            BenchmarkId::new("sequential_batch", image_count),
            image_count,
            |b, &count| {
                let images: Vec<DynamicImage> =
                    (0..count).map(|_| create_test_image(512, 512, 3)).collect();

                b.iter(|| {
                    let results: Vec<Result<(u32, u32), ()>> =
                        images.iter().map(|img| Ok(img.dimensions())).collect();
                    black_box(results);
                });
            },
        );
    }

    group.finish();
}

fn bench_memory_pool(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_pool");

    let pool = MemoryPool::new(1024 * 1024, 8); // 1MB buffers, 8 in pool

    group.bench_function("with_pool", |b| {
        b.iter(|| {
            let buffer = pool.get_buffer();
            // Simulate some work
            let _sum: u64 = buffer.iter().map(|&x| x as u64).sum();
            pool.return_buffer(buffer);
        });
    });

    group.bench_function("without_pool", |b| {
        b.iter(|| {
            let buffer = vec![0u8; 1024 * 1024];
            // Simulate some work
            let _sum: u64 = buffer.iter().map(|&x| x as u64).sum();
            // Buffer is dropped here
        });
    });

    group.finish();
}

fn bench_optimized_image_buffer(c: &mut Criterion) {
    let mut group = c.benchmark_group("optimized_image_buffer");

    let width = 1024u32;
    let height = 1024u32;
    let channels = 3u8;
    let data_size = (width * height * channels as u32) as usize;
    let test_data: Vec<u8> = (0..data_size).map(|i| (i % 256) as u8).collect();

    group.bench_function("create_optimized", |b| {
        b.iter(|| {
            let buffer = OptimizedImageBuffer::from_vec(
                black_box(test_data.clone()),
                width,
                height,
                channels,
            )
            .unwrap();
            black_box(buffer);
        });
    });

    group.bench_function("create_standard", |b| {
        b.iter(|| {
            let buffer = ImageBuffer::<Rgb<u8>, Vec<u8>>::from_raw(
                width,
                height,
                black_box(test_data.clone()),
            )
            .unwrap();
            black_box(buffer);
        });
    });

    group.finish();
}

fn bench_compression_engine_optimized(c: &mut Criterion) {
    let mut group = c.benchmark_group("compression_engine");

    // Create test image data
    let img = create_test_image(1024, 1024, 3);
    let mut test_data = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut test_data),
        image::ImageFormat::Png,
    )
    .unwrap();

    let options = CompressionOptions {
        format: Some("webp".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    group.bench_function("optimized_engine", |b| {
        let engine = CompressionEngine::new();
        b.iter(|| {
            let result = engine.compress(black_box(&test_data), black_box(&options));
            black_box(result);
        });
    });

    group.bench_function("batch_compression", |b| {
        let engine = CompressionEngine::new();
        let batch_data = vec![test_data.as_slice(); 4];

        b.iter(|| {
            let results = engine.compress_batch(black_box(batch_data.clone()), black_box(&options));
            black_box(results);
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_simd_color_conversion,
    bench_simd_quantization,
    bench_parallel_processing,
    bench_memory_pool,
    bench_optimized_image_buffer,
    bench_compression_engine_optimized
);
criterion_main!(benches);
