use rusty_pic_core::{CompressionEngine, CompressionOptions};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;

// 可选小型分配器（通过 feature = "wee_alloc" 开启）
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// 可选 panic hook（通过 feature = "console_error_panic_hook" 开启）
#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// 简化的压缩选项
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct JsCompressionOptions {
    format: Option<String>,
    quality: Option<u8>,
}

#[wasm_bindgen]
impl JsCompressionOptions {
    #[wasm_bindgen(constructor)]
    pub fn new() -> JsCompressionOptions {
        JsCompressionOptions {
            format: None,
            quality: None,
        }
    }

    #[wasm_bindgen(js_name = setFormat)]
    pub fn set_format(&mut self, format: Option<String>) {
        self.format = format;
    }

    #[wasm_bindgen(js_name = setQuality)]
    pub fn set_quality(&mut self, q: Option<u8>) {
        self.quality = q;
    }
}

/// 简化的压缩结果
#[wasm_bindgen]
pub struct JsCompressionResult {
    data: js_sys::Uint8Array,
    format: String,
    original_size: usize,
    compressed_size: usize,
    compression_ratio: f32,
    processing_time: u64,
}

#[wasm_bindgen]
impl JsCompressionResult {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> js_sys::Uint8Array {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn format(&self) -> String {
        self.format.clone()
    }

    #[wasm_bindgen(js_name = originalSize, getter)]
    pub fn original_size(&self) -> usize {
        self.original_size
    }

    #[wasm_bindgen(js_name = compressedSize, getter)]
    pub fn compressed_size(&self) -> usize {
        self.compressed_size
    }

    #[wasm_bindgen(js_name = compressionRatio, getter)]
    pub fn compression_ratio(&self) -> f32 {
        self.compression_ratio
    }

    #[wasm_bindgen(js_name = processingTime, getter)]
    pub fn processing_time(&self) -> u64 {
        self.processing_time
    }
}

/// 简化的 RustyPic 类
#[wasm_bindgen]
pub struct RustyPic;

#[wasm_bindgen]
impl RustyPic {
    #[wasm_bindgen(constructor)]
    pub fn new() -> RustyPic {
        RustyPic
    }

    /// 简化的压缩方法 - 目前只是返回原始数据作为测试
    #[wasm_bindgen(js_name = compress)]
    pub fn compress_async(
        &self,
        data: js_sys::Uint8Array,
        options: JsCompressionOptions,
    ) -> js_sys::Promise {
        let input_vec = data.to_vec();

        future_to_promise(async move {
            // 创建压缩引擎
            let engine = CompressionEngine::new();

            // 构建压缩选项
            let compression_options = CompressionOptions {
                format: options.format.or_else(|| Some("png".to_string())),
                quality: options.quality.or(Some(80)),
                resize: None,
                optimize: None,
            };

            match engine.compress(&input_vec, &compression_options) {
                Ok(result) => {
                    let output_data = js_sys::Uint8Array::from(&result.data[..]);

                    let js_result = JsCompressionResult {
                        data: output_data,
                        format: result.format,
                        original_size: result.original_size,
                        compressed_size: result.compressed_size,
                        compression_ratio: result.compression_ratio,
                        processing_time: result.processing_time,
                    };

                    Ok(JsValue::from(js_result))
                }
                Err(e) => {
                    // 如果压缩失败，返回错误信息
                    let error_msg = format!("Compression failed: {}", e);
                    Err(JsValue::from_str(&error_msg))
                }
            }
        })
    }
}

/// 工厂方法
#[wasm_bindgen(js_name = createRustyPic)]
pub fn create_rusty_pic() -> RustyPic {
    RustyPic::new()
}

/// 测试函数
#[wasm_bindgen]
pub fn test_wasm() -> String {
    "WASM module loaded successfully!".to_string()
}
