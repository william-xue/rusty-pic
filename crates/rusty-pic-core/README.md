# rusty-pic-core

Core image compression algorithms for the rusty-pic project.

## Overview

This crate provides the fundamental image processing and compression functionality that powers the rusty-pic ecosystem. It includes:

- **ImageAnalyzer**: Analyzes images to determine optimal compression strategies
- **CompressionEngine**: Unified interface for image compression across multiple formats
- **Format Support**: JPEG, PNG, WebP (with AVIF planned)
- **Smart Compression**: Automatic format selection and quality optimization
- **Performance Optimized**: Built with Rust for maximum performance

## Features

- ✅ Image format detection and metadata extraction
- ✅ Intelligent compression recommendations
- ✅ Resize operations with multiple fit modes
- ✅ JPEG and PNG compression
- ✅ Error handling and logging support
- 🚧 WebP compression (fallback to PNG currently)
- 🚧 AVIF compression (planned)
- 🚧 SIMD optimizations (planned)
- 🚧 Multi-threading support (planned)

## Usage

```rust
use rusty_pic_core::{ImageAnalyzer, CompressionEngine, CompressionOptions};

// Analyze an image
let analyzer = ImageAnalyzer::new();
let analysis = analyzer.analyze(&image_data)?;

println!("Recommended format: {}", analysis.recommended_format);
println!("Recommended quality: {}", analysis.recommended_quality);

// Compress an image
let engine = CompressionEngine::new();
let options = CompressionOptions {
    format: Some("auto".to_string()), // Use analyzer recommendation
    quality: Some(80),
    resize: None,
    optimize: None,
};

let result = engine.compress(&image_data, &options)?;
println!("Compressed {} bytes to {} bytes ({:.1}% reduction)", 
    result.original_size, 
    result.compressed_size,
    (1.0 - result.compression_ratio) * 100.0
);
```

## Architecture

The crate is organized into several modules:

- `analyzer`: Image analysis and recommendation logic
- `compression`: Main compression engine and coordination
- `formats`: Format-specific encoders (JPEG, PNG, WebP, AVIF)

## Performance

The crate includes comprehensive benchmarks that can be run with:

```bash
cargo bench
```

Current performance characteristics:
- Fast image analysis with complexity detection
- Efficient resize operations using high-quality filters
- Optimized compression pipelines
- Memory-efficient processing

## Testing

Run the test suite with:

```bash
cargo test
```

The test suite includes:
- Unit tests for all core functionality
- Integration tests with real image data
- Error handling verification
- Performance benchmarks

## Requirements

This crate requires Rust 1.70+ and depends on:

- `image`: Core image processing library
- `rayon`: Parallel processing (planned)
- `thiserror`: Error handling
- `serde`: Serialization support
- `log`: Optional logging support

## License

This project is licensed under the MIT License.