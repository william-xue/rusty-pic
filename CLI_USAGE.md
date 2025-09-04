# Rusty-Pic CLI 使用指南

Rusty-Pic 提供了强大的命令行工具，让你可以在终端中快速压缩图片。

## 安装

### 全局安装
```bash
npm install -g @fe-fast/rusty-pic
```

### 本地开发安装
```bash
npm link
```

## 基本用法

### 查看帮助
```bash
rusty-pic --help
rusty-pic compress --help
```

### 查看版本
```bash
rusty-pic --version
```

## 命令详解

### 1. 压缩单个文件 (`compress`)

基本压缩：
```bash
rusty-pic compress input.jpg
```

指定输出路径：
```bash
rusty-pic compress input.jpg -o output.webp
```

设置压缩质量：
```bash
rusty-pic compress input.jpg -q 90
```

指定输出格式：
```bash
rusty-pic compress input.jpg -f webp
```

调整图片尺寸：
```bash
rusty-pic compress input.jpg --width 800 --height 600
```

启用渐进式编码：
```bash
rusty-pic compress input.jpg --progressive
```

启用无损压缩：
```bash
rusty-pic compress input.jpg --lossless
```

### 2. 批量压缩 (`batch`)

批量压缩目录中的所有图片：
```bash
rusty-pic batch ./images -o ./compressed
```

递归处理子目录：
```bash
rusty-pic batch ./images --recursive
```

### 3. 智能压缩 (`smart`)

自动选择最佳压缩参数：
```bash
rusty-pic smart input.jpg
```

指定目标文件大小：
```bash
rusty-pic smart input.jpg -s 100000  # 目标大小 100KB
```

### 4. 查看图片信息 (`info`)

显示图片详细信息：
```bash
rusty-pic info input.jpg
```

## 参数说明

### 通用参数
- `-o, --output <path>`: 输出路径
- `-q, --quality <number>`: 压缩质量 (0-100，默认 80)
- `-f, --format <format>`: 输出格式 (webp|jpeg|png|auto，默认 auto)

### 尺寸调整
- `--width <number>`: 最大宽度
- `--height <number>`: 最大高度

### 优化选项
- `--progressive`: 启用渐进式编码
- `--lossless`: 启用无损压缩
- `--recursive`: 递归处理子目录（批量模式）

### 智能压缩
- `-s, --size <number>`: 目标文件大小（字节）

## 支持的格式

### 输入格式
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- AVIF (.avif)

### 输出格式
- WebP (推荐，最佳压缩率)
- JPEG (兼容性好)
- PNG (无损压缩)
- AVIF (新一代格式)

## 使用示例

### 网站图片优化
```bash
# 将所有图片转换为 WebP 格式，质量 85%
rusty-pic batch ./website/images -f webp -q 85 -o ./website/optimized

# 压缩单个大图片，限制宽度为 1920px
rusty-pic compress hero.jpg --width 1920 -f webp -q 90
```

### 移动端图片处理
```bash
# 生成适合移动端的小尺寸图片
rusty-pic compress large-image.jpg --width 375 -f webp -q 80 -o mobile.webp
```

### 智能压缩到指定大小
```bash
# 将图片压缩到 50KB 以下
rusty-pic smart large-photo.jpg -s 51200 -o compressed.webp
```

## 性能特点

- 🚀 **高性能**: 基于 Rust 的高效压缩算法
- 📦 **小体积**: 压缩率通常可达 70-90%
- 🔧 **智能优化**: 自动选择最佳压缩参数
- 🌐 **跨平台**: 支持 Windows、macOS、Linux

## 错误处理

如果遇到错误，CLI 会显示详细的错误信息：

```bash
rusty-pic compress non-existent.jpg
# 输出: 压缩失败: 文件不存在
```

## 开发者选项

### 调试模式
```bash
DEBUG=rusty-pic rusty-pic compress input.jpg
```

### 性能分析
```bash
rusty-pic compress input.jpg --verbose
```

## 更多信息

- 📚 [完整文档](./README.md)
- 🐛 [问题反馈](https://github.com/fe-fast/rusty-pic/issues)
- 💡 [功能建议](https://github.com/fe-fast/rusty-pic/discussions)