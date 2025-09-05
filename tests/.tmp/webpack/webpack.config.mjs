import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _rp = require('../../../src/vite-plugin/webpack.js');
const RustyPicWebpackPlugin = _rp.default || _rp;

export default {
  mode: 'production',
  entry: path.resolve('/Users/xueyuan/Desktop/open code/rusty-pic/tests/.tmp/webpack/src/index.js'),
  output: {
    path: path.resolve('/Users/xueyuan/Desktop/open code/rusty-pic/tests/.tmp/webpack/dist'),
    filename: 'bundle.js',
    clean: true,
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]'
  },
  module: {
    rules: [
      { test: /\.(png|jpe?g|webp|avif)$/i, type: 'asset/resource' }
    ]
  },
  plugins: [
    new RustyPicWebpackPlugin({
      quality: 80,
      format: 'auto',
      verbose: true
    })
  ]
};
