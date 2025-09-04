import { useState, useCallback, useRef } from "react";
import { Upload, Download, Image as ImageIcon, Zap, BarChart3, Settings, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { rustyPic, type CompressionOptions, type CompressionResult as RustyPicResult } from "@/lib/rusty-pic";

interface CompressedResult {
  originalFile: File;
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  format: string;
}

interface CompressionSettings {
  quality: number;
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  mode: 'conservative' | 'balanced' | 'aggressive';
  maxWidth?: number;
  maxHeight?: number;
}

const defaultSettings: CompressionSettings = {
  quality: 80,
  format: 'auto',
  mode: 'balanced',
};

const formatOptions = [
  { value: 'auto', label: '自动选择' },
  { value: 'webp', label: 'WebP' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
];

const modeOptions = [
  { value: 'conservative', label: '保守模式', description: '优先保证质量' },
  { value: 'balanced', label: '平衡模式', description: '质量与大小平衡' },
  { value: 'aggressive', label: '激进模式', description: '最大压缩率' },
];

export default function Demo() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<CompressedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState<CompressionSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用浏览器原生 Canvas API 进行图片压缩演示
  const compressImage = useCallback(async (file: File, settings: CompressionSettings): Promise<CompressedResult> => {
    try {
      // 构建压缩选项
      const options: CompressionOptions = {
        format: settings.format,
        quality: settings.quality,
        resize: (settings.maxWidth || settings.maxHeight) ? {
          width: settings.maxWidth,
          height: settings.maxHeight,
          fit: 'contain'
        } : undefined,
        optimize: {
          colors: settings.mode !== 'conservative',
          progressive: settings.mode === 'aggressive',
          lossless: false,
        }
      };

      // 使用 RustyPic API 压缩
      const result = await rustyPic.compress(file, options);

      // 将结果转换为 Blob
      const compressedBlob = new Blob([result.data], {
        type: `image/${result.format}`
      });

      return {
        originalFile: file,
        compressedBlob,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        processingTime: result.processingTime,
        format: result.format,
      };
    } catch (error) {
      console.error('Compression failed:', error);
      toast.error(`压缩 ${file.name} 失败: ${error instanceof Error ? error.message : '未知错误'}`);
      throw error;
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
      toast.success(`已添加 ${droppedFiles.length} 个图片文件`);
    } else {
      toast.error('请上传图片文件');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
      toast.success(`已添加 ${selectedFiles.length} 个图片文件`);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResults(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processImages = useCallback(async () => {
    if (files.length === 0) {
      toast.error('请先上传图片文件');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      const newResults: CompressedResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        toast.info(`正在处理 ${file.name}...`);

        const result = await compressImage(file, settings);
        newResults.push(result);
        setResults([...newResults]);
      }

      toast.success('所有图片处理完成！');
    } catch (error) {
      toast.error('处理过程中出现错误');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [files, settings, compressImage]);

  const downloadResult = useCallback((result: CompressedResult) => {
    const url = URL.createObjectURL(result.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${result.originalFile.name.replace(/\.[^/.]+$/, '')}.${result.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('文件下载开始');
  }, []);

  const downloadAll = useCallback(() => {
    results.forEach(result => {
      setTimeout(() => downloadResult(result), 100);
    });
  }, [results, downloadResult]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyStats = useCallback((result: CompressedResult, index: number) => {
    const stats = `原始大小: ${formatFileSize(result.originalSize)}\n压缩后: ${formatFileSize(result.compressedSize)}\n压缩率: ${result.compressionRatio.toFixed(1)}%\n处理时间: ${result.processingTime}ms`;
    navigator.clipboard.writeText(stats);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('统计信息已复制到剪贴板');
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
          在线图片压缩演示
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          体验 Rusty-Pic 的强大压缩能力，支持拖拽上传、实时处理和效果对比。
          <br />
          <span className="text-sm text-orange-600">当前使用浏览器原生 Canvas API 进行演示</span>
        </p>
      </div>

      {/* Settings Panel */}
      <div className="mb-8">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>压缩设置</span>
        </button>

        {showSettings && (
          <div className="mt-4 p-6 bg-white rounded-lg border border-slate-200">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Quality */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  质量: {settings.quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.quality}
                  onChange={(e) => setSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  输出格式
                </label>
                <select
                  value={settings.format}
                  onChange={(e) => setSettings(prev => ({ ...prev, format: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  压缩模式
                </label>
                <select
                  value={settings.mode}
                  onChange={(e) => setSettings(prev => ({ ...prev, mode: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {modeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
          ? 'border-orange-400 bg-orange-50'
          : 'border-slate-300 hover:border-slate-400'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="w-12 h-12 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-900">
              拖拽图片到这里，或者
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-orange-600 hover:text-orange-700 underline ml-1"
              >
                点击选择文件
              </button>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              支持 PNG、JPEG、WebP 格式，可同时上传多个文件
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              待处理文件 ({files.length})
            </h3>
            <div className="space-x-2">
              <button
                onClick={processImages}
                disabled={isProcessing}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isProcessing ? '处理中...' : '开始压缩'}
              </button>
              {results.length > 0 && (
                <button
                  onClick={downloadAll}
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载全部
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {files.map((file, index) => {
              const result = results[index];
              return (
                <div key={index} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {result && (
                        <>
                          <button
                            onClick={() => copyStats(result, index)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="复制统计信息"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => downloadResult(result)}
                            className="p-2 text-blue-500 hover:text-blue-600 transition-colors"
                            title="下载压缩文件"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="p-2 text-red-500 hover:text-red-600 transition-colors"
                        title="移除文件"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {result && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">压缩后大小</p>
                          <p className="font-medium text-green-600">
                            {formatFileSize(result.compressedSize)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">压缩率</p>
                          <p className="font-medium text-orange-600">
                            {result.compressionRatio.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">处理时间</p>
                          <p className="font-medium text-blue-600">
                            {result.processingTime}ms
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">输出格式</p>
                          <p className="font-medium text-purple-600 uppercase">
                            {result.format}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>压缩进度</span>
                          <span>{result.compressionRatio.toFixed(1)}% 减少</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, result.compressionRatio))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isProcessing && !result && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-sm text-slate-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                        <span>正在处理...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">压缩统计</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {results.length}
              </p>
              <p className="text-sm text-orange-700">处理文件</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatFileSize(results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0))}
              </p>
              <p className="text-sm text-green-700">节省空间</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length).toFixed(1)}%
              </p>
              <p className="text-sm text-blue-700">平均压缩率</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length)}ms
              </p>
              <p className="text-sm text-purple-700">平均处理时间</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}