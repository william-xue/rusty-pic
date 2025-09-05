# GitHub Actions 工作流说明

本项目包含以下 GitHub Actions 工作流：

## 🔄 CI/CD 工作流

### 1. CI (ci.yml)
**触发条件**: 推送到 main/develop 分支或创建 PR

**功能**:
- Rust 代码检查（格式化、Clippy、测试）
- JavaScript/TypeScript 检查（类型检查、ESLint、格式化、测试）
- WASM 包构建
- 前端应用构建

### 2. Release (release.yml)
**触发条件**: 推送版本标签 (v*)

**功能**:
- 创建 GitHub Release
- 构建并发布 npm 包
- 上传发布资源

**使用方法**:
```bash
# 创建并推送版本标签
git tag v0.2.1
git push origin v0.2.1
```

### 3. Deploy (deploy.yml)
**触发条件**: 推送到 main 分支

**功能**:
- 构建项目演示网站
- 部署到 GitHub Pages

**访问地址**: https://fe-fast.github.io/rusty-pic/

### 4. Security (security.yml)
**触发条件**: 
- 每周一自动运行
- 依赖文件变更时
- 手动触发

**功能**:
- Rust 安全审计 (cargo-audit, cargo-deny)
- JavaScript 安全审计 (pnpm audit)

## 🔧 配置要求

### Secrets 配置
在 GitHub 仓库设置中添加以下 Secrets：

1. **NPM_TOKEN**: npm 发布令牌
   - 访问 https://www.npmjs.com/settings/tokens
   - 创建 "Automation" 类型的令牌
   - 在仓库 Settings > Secrets and variables > Actions 中添加

### GitHub Pages 配置
1. 进入仓库 Settings > Pages
2. Source 选择 "GitHub Actions"
3. 工作流会自动部署到 GitHub Pages

## 📋 工作流状态

可以在以下位置查看工作流状态：
- 仓库主页的 Actions 标签
- PR 页面的检查状态
- README 中的状态徽章

## 🚀 发布流程

1. **开发阶段**: 在 develop 分支开发，CI 会自动运行测试
2. **合并到 main**: 创建 PR 到 main 分支，通过 CI 检查后合并
3. **发布版本**: 
   ```bash
   # 更新版本号
   pnpm version patch  # 或 minor, major
   
   # 推送标签触发发布
   git push origin main --tags
   ```
4. **自动部署**: main 分支的更改会自动部署到 GitHub Pages

## 🔍 故障排除

### 常见问题
1. **WASM 构建失败**: 检查 Rust 工具链和 wasm-pack 版本
2. **npm 发布失败**: 检查 NPM_TOKEN 是否正确配置
3. **Pages 部署失败**: 检查 GitHub Pages 设置和构建输出

### 调试方法
1. 查看 Actions 页面的详细日志
2. 本地运行相同的构建命令
3. 检查依赖版本兼容性

