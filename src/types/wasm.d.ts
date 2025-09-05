declare module '../../pkg/rusty_pic_wasm.js' {
    export interface JsCompressionOptions {
        new(): JsCompressionOptions;
        setFormat(format?: string): void;
        setQuality(quality?: number): void;
        setResize(width?: number, height?: number, fit?: string): void;
        setOptimize(colors?: boolean, progressive?: boolean, lossless?: boolean): void;
    }

    export interface JsCompressionResult {
        data: Uint8Array;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
        format: string;
        processingTime: number;
    }

    export class RustyPic {
        constructor();
        compress(data: Uint8Array, options: JsCompressionOptions): Promise<JsCompressionResult>;
    }

    export function createRustyPic(): RustyPic;

    export default function init(bytes?: Buffer | Uint8Array): Promise<void>;
}

// Package export alias for TypeScript to resolve before pkg is built
declare module '@fe-fast/rusty-pic/wasm' {
    export interface JsCompressionOptions {
        new(): JsCompressionOptions;
        setFormat(format?: string): void;
        setQuality(quality?: number): void;
        setResize(width?: number, height?: number, fit?: string): void;
        setOptimize(colors?: boolean, progressive?: boolean, lossless?: boolean): void;
    }

    export interface JsCompressionResult {
        data: Uint8Array;
        originalSize: number;
        compressedSize: number;
        compressionRatio: number;
        format: string;
        processingTime: number;
    }

    export class RustyPic {
        constructor();
        compress(data: Uint8Array, options: JsCompressionOptions): Promise<JsCompressionResult>;
    }

    export function createRustyPic(): RustyPic;

    export default function init(bytes?: Buffer | Uint8Array): Promise<void>;
}
