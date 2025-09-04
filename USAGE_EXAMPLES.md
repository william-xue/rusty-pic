# 📖 Rusty-Pic 使用示例

## 🚀 快速开始

### 安装

```bash
npm install @fe-fast/rusty-pic
```

### 基础使用

```javascript
import { compress, RustyPic } from '@fe-fast/rusty-pic';

// 方式1: 使用便捷函数
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    const result = await compress(file, {
        format: 'webp',
        quality: 80
    });
    
    console.log(`压缩完成: ${result.originalSize} → ${result.compressedSize} bytes`);
    console.log(`压缩率: ${result.compressionRatio.toFixed(1)}%`);
});
```

## 🎛️ 高级配置

### 智能压缩

```javascript
import { smartCompress } from '@fe-fast/rusty-pic';

// 自动选择最佳压缩参数
const result = await smartCompress(file, 100 * 1024); // 目标大小 100KB
```

### 批量处理

```javascript
import { compressBatch } from '@fe-fast/rusty-pic';

const files = Array.from(fileInput.files);

const results = await compressBatch(files, {
    format: 'auto', // 自动选择格式
    quality: 85
}, (progress) => {
    console.log(`进度: ${progress.completed}/${progress.total}`);
    if (progress.errors.length > 0) {
        console.log('错误:', progress.errors);
    }
});
```

### 自定义缩放

```javascript
const result = await compress(file, {
    format: 'webp',
    quality: 80,
    resize: {
        width: 800,
        height: 600,
        fit: 'cover' // 'cover' | 'contain' | 'fill'
    }
});
```

### 优化选项

```javascript
const result = await compress(file, {
    format: 'jpeg',
    quality: 85,
    optimize: {
        colors: true,        // 颜色优化
        progressive: true,   // 渐进式编码
        lossless: false     // 无损压缩
    }
});
```

## 🔧 类实例使用

```javascript
import { RustyPic } from '@fe-fast/rusty-pic';

const rustyPic = new RustyPic();

// 手动初始化
await rustyPic.init();

// 检查状态
console.log('已初始化:', rustyPic.isInitialized());
console.log('版本:', rustyPic.getVersion());
console.log('支持格式:', rustyPic.getSupportedFormats());

// 压缩图片
const result = await rustyPic.compress(file, options);
```

## 🌐 在不同环境中使用

### React 应用

```jsx
import React, { useState } from 'react';
import { compress } from '@fe-fast/rusty-pic';

function ImageCompressor() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCompress = async (file) => {
        setLoading(true);
        try {
            const compressed = await compress(file, {
                format: 'webp',
                quality: 80
            });
            setResult(compressed);
        } catch (error) {
            console.error('压缩失败:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleCompress(e.target.files[0])}
            />
            {loading && <p>压缩中...</p>}
            {result && (
                <div>
                    <p>原始大小: {result.originalSize} bytes</p>
                    <p>压缩后: {result.compressedSize} bytes</p>
                    <p>压缩率: {result.compressionRatio.toFixed(1)}%</p>
                </div>
            )}
        </div>
    );
}
```

### Vue 应用

```vue
<template>
  <div>
    <input type="file" @change="handleCompress" accept="image/*" />
    <div v-if="loading">压缩中...</div>
    <div v-if="result">
      <p>压缩率: {{ result.compressionRatio.toFixed(1) }}%</p>
    </div>
  </div>
</template>

<script>
import { compress } from '@fe-fast/rusty-pic';

export default {
  data() {
    return {
      result: null,
      loading: false
    };
  },
  methods: {
    async handleCompress(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.loading = true;
      try {
        this.result = await compress(file, {
          format: 'webp',
          quality: 80
        });
      } catch (error) {
        console.error('压缩失败:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

### Node.js (服务端)

```javascript
import fs from 'fs';
import { compress } from '@fe-fast/rusty-pic';

// 读取文件
const imageBuffer = fs.readFileSync('input.jpg');

// 压缩
const result = await compress(imageBuffer, {
    format: 'webp',
    quality: 80
});

// 保存结果
fs.writeFileSync('output.webp', result.data);

console.log(`压缩完成: ${result.compressionRatio.toFixed(1)}% 压缩率`);
```

## 🎯 最佳实践

### 1. 格式选择建议

```javascript
// 照片类图片
const photoOptions = {
    format: 'jpeg',
    quality: 85,
    optimize: { progressive: true }
};

// 图标和简单图形
const iconOptions = {
    format: 'webp',
    quality: 90,
    optimize: { lossless: true }
};

// 透明图片
const transparentOptions = {
    format: 'webp', // 或 'png'
    quality: 80
};
```

### 2. 性能优化

```javascript
// 预初始化实例（推荐）
const rustyPic = new RustyPic();
await rustyPic.init(); // 在应用启动时初始化

// 批量处理时复用实例
const results = [];
for (const file of files) {
    const result = await rustyPic.compress(file, options);
    results.push(result);
}
```

### 3. 错误处理

```javascript
try {
    const result = await compress(file, options);
    // 处理成功结果
} catch (error) {
    if (error.message.includes('WASM')) {
        console.log('WASM 模块加载失败，已自动使用 Canvas API 后备方案');
    } else {
        console.error('压缩失败:', error);
    }
}
```

## 📊 性能监控

```javascript
const result = await compress(file, options);

console.log('性能指标:', {
    processingTime: result.processingTime,
    compressionRatio: result.compressionRatio,
    throughput: result.originalSize / result.processingTime * 1000 // bytes/second
});
```

## 🔗 相关链接

- [GitHub 仓库](https://github.com/fe-fast/rusty-pic)
- [NPM 包页面](https://www.npmjs.com/package/@fe-fast/rusty-pic)
- [在线演示](https://rusty-pic.vercel.app)
- [API 文档](https://github.com/fe-fast/rusty-pic#api)