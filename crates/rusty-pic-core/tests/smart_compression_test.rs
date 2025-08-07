use rusty_pic_core::{SmartCompressionConstraints, SmartCompressionEngine};

#[test]
fn test_smart_compression_engine_creation() {
    let engine = SmartCompressionEngine::new();
    // Test that the engine can be created without panicking
    assert!(std::ptr::addr_of!(engine) as *const _ != std::ptr::null());
}

#[test]
fn test_smart_compression_constraints_creation() {
    let constraints = SmartCompressionConstraints {
        target_size: Some("100kb".to_string()),
        max_width: Some(1920),
        max_height: Some(1080),
        min_quality: Some(70),
        preferred_formats: Some(vec!["webp".to_string(), "avif".to_string()]),
        resize: None,
    };

    assert_eq!(constraints.target_size.as_ref().unwrap(), "100kb");
    assert_eq!(constraints.max_width.unwrap(), 1920);
    assert_eq!(constraints.max_height.unwrap(), 1080);
    assert_eq!(constraints.min_quality.unwrap(), 70);
    assert_eq!(constraints.preferred_formats.as_ref().unwrap().len(), 2);
}

#[test]
fn test_parse_target_size() {
    let engine = SmartCompressionEngine::new();

    // Test various size formats
    assert_eq!(engine.parse_target_size("100kb").unwrap(), 102400);
    assert_eq!(engine.parse_target_size("1mb").unwrap(), 1048576);
    assert_eq!(engine.parse_target_size("1024").unwrap(), 1024);
    assert_eq!(engine.parse_target_size("500KB").unwrap(), 512000);
    assert_eq!(engine.parse_target_size("2MB").unwrap(), 2097152);
}

#[test]
fn test_parse_target_size_invalid() {
    let engine = SmartCompressionEngine::new();

    // Test invalid formats
    assert!(engine.parse_target_size("invalid").is_err());
    assert!(engine.parse_target_size("100gb").is_err());
    assert!(engine.parse_target_size("").is_err());
}

// Note: More comprehensive tests would require actual image data
// These tests focus on the basic functionality and structure
#[test]
fn test_smart_compression_constraints_with_resize() {
    let resize_options = rusty_pic_core::compression::ResizeOptions {
        width: Some(800),
        height: Some(600),
        fit: "contain".to_string(),
    };

    let constraints = SmartCompressionConstraints {
        target_size: Some("50kb".to_string()),
        max_width: Some(1920),
        max_height: Some(1080),
        min_quality: Some(60),
        preferred_formats: Some(vec!["webp".to_string()]),
        resize: Some(resize_options),
    };

    assert_eq!(constraints.target_size.as_ref().unwrap(), "50kb");
    assert!(constraints.resize.is_some());
    assert_eq!(constraints.resize.as_ref().unwrap().width.unwrap(), 800);
    assert_eq!(constraints.resize.as_ref().unwrap().height.unwrap(), 600);
    assert_eq!(constraints.resize.as_ref().unwrap().fit, "contain");
}

#[test]
fn test_advanced_image_analysis_structure() {
    use rusty_pic_core::{AdvancedImageAnalysis, ColorAnalysis, FrequencyAnalysis};

    let color_analysis = ColorAnalysis {
        unique_colors: 5000,
        color_diversity: 0.7,
        color_variance: 0.4,
        dominant_colors: vec![(255, 0, 0), (0, 255, 0), (0, 0, 255)],
    };

    let frequency_analysis = FrequencyAnalysis {
        high_frequency_ratio: 0.65,
        low_frequency_ratio: 0.35,
        total_energy: 1500.0,
    };

    let analysis = AdvancedImageAnalysis {
        edge_density: 0.45,
        texture_complexity: 0.72,
        color_analysis,
        frequency_analysis,
        overall_complexity: 0.68,
        perceptual_quality_score: 0.85,
    };

    // Verify the structure is properly constructed
    assert_eq!(analysis.edge_density, 0.45);
    assert_eq!(analysis.texture_complexity, 0.72);
    assert_eq!(analysis.overall_complexity, 0.68);
    assert_eq!(analysis.perceptual_quality_score, 0.85);
    assert_eq!(analysis.color_analysis.unique_colors, 5000);
    assert_eq!(analysis.frequency_analysis.high_frequency_ratio, 0.65);
}

#[test]
fn test_parse_target_size_edge_cases() {
    let engine = SmartCompressionEngine::new();

    // Test case sensitivity
    assert_eq!(engine.parse_target_size("100KB").unwrap(), 102400);
    assert_eq!(engine.parse_target_size("1MB").unwrap(), 1048576);

    // Test decimal values
    assert_eq!(engine.parse_target_size("1.5mb").unwrap(), 1572864);
    assert_eq!(engine.parse_target_size("0.5kb").unwrap(), 512);

    // Test whitespace handling (should fail)
    assert!(engine.parse_target_size(" 100kb ").is_err());
}
