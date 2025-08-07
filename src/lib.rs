use js_sys::Uint8Array;
use rusty_pic_core::{CompressionEngine, ImageAnalyzer};
use wasm_bindgen::prelude::*;

// 当 `console_error_panic_hook` 功能启用时，我们可以调用
// `set_panic_hook` 函数至少一次在初始化期间，然后我们将在
// 我们的 wasm 模块中获得更好的错误消息。
#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

// 当启用 `wee_alloc` 功能时，使用 `wee_alloc` 作为全局分配器。
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, rusty-pic!");
}

// 日志宏
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// WASM bindings for the core compression functionality
#[wasm_bindgen]
pub struct CompressionResult {
    data: Vec<u8>,
    original_size: usize,
    compressed_size: usize,
    compression_ratio: f64,
}

#[wasm_bindgen]
impl CompressionResult {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Uint8Array {
        Uint8Array::from(&self.data[..])
    }

    #[wasm_bindgen(getter)]
    pub fn original_size(&self) -> usize {
        self.original_size
    }

    #[wasm_bindgen(getter)]
    pub fn compressed_size(&self) -> usize {
        self.compressed_size
    }

    #[wasm_bindgen(getter)]
    pub fn compression_ratio(&self) -> f64 {
        self.compression_ratio
    }
}

// Basic compression function using the core crate
#[wasm_bindgen]
pub fn compress_image(input_data: &[u8]) -> Result<CompressionResult, JsValue> {
    console_log!("Starting image compression with core crate...");

    let analyzer = ImageAnalyzer::new();
    let engine = CompressionEngine::new();

    // Analyze the image
    let _analysis = analyzer
        .analyze(input_data)
        .map_err(|e| JsValue::from_str(&format!("Analysis failed: {}", e)))?;

    // Create basic compression options
    let options = rusty_pic_core::compression::CompressionOptions {
        format: Some("webp".to_string()),
        quality: Some(80),
        resize: None,
        optimize: None,
    };

    // Compress the image
    let result = engine
        .compress(input_data, &options)
        .map_err(|e| JsValue::from_str(&format!("Compression failed: {}", e)))?;

    console_log!("Compression completed successfully");

    Ok(CompressionResult {
        data: result.data,
        original_size: result.original_size,
        compressed_size: result.compressed_size,
        compression_ratio: result.compression_ratio as f64,
    })
}

// Analyze image using the core crate
#[wasm_bindgen]
pub fn analyze_image(input_data: &[u8]) -> Result<JsValue, JsValue> {
    let analyzer = ImageAnalyzer::new();
    let analysis = analyzer
        .analyze(input_data)
        .map_err(|e| JsValue::from_str(&format!("Analysis failed: {}", e)))?;

    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"width".into(), &JsValue::from(analysis.width))?;
    js_sys::Reflect::set(&result, &"height".into(), &JsValue::from(analysis.height))?;
    js_sys::Reflect::set(
        &result,
        &"format".into(),
        &JsValue::from_str(&analysis.format),
    )?;
    js_sys::Reflect::set(
        &result,
        &"hasAlpha".into(),
        &JsValue::from(analysis.has_alpha),
    )?;
    js_sys::Reflect::set(
        &result,
        &"colorCount".into(),
        &JsValue::from(analysis.color_count),
    )?;
    js_sys::Reflect::set(
        &result,
        &"complexity".into(),
        &JsValue::from(analysis.complexity),
    )?;
    js_sys::Reflect::set(
        &result,
        &"recommendedFormat".into(),
        &JsValue::from_str(&analysis.recommended_format),
    )?;
    js_sys::Reflect::set(
        &result,
        &"recommendedQuality".into(),
        &JsValue::from(analysis.recommended_quality),
    )?;
    js_sys::Reflect::set(
        &result,
        &"estimatedSavings".into(),
        &JsValue::from(analysis.estimated_savings),
    )?;

    Ok(result.into())
}

// 初始化函数
#[wasm_bindgen(start)]
pub fn main() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    console_log!("Rusty-Pic WASM module initialized with new architecture!");
    console_log!("Using modular core crate for image processing");
}
