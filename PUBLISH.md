# 发布指南

## 📦 发布到 npm

### 前置条件

1. **登录 npm**
   ```bash
   npm login
   # 使用你的 npm 账号登录
   ```

2. **验证登录状态**
   ```bash
   npm whoami
   # 应该显示: fe-fast
   ```

### 发布步骤

1. **构建项目**
   ```bash
   # 运行构建脚本
   ./scripts/build-for-publish.sh
   
   # 或者手动构建
   pnpm run build
   ```

2. **验证包内容**
   ```bash
   # 预览将要发布的文件
   npm pack --dry-run
   
   # 或者创建 tarball 查看
   npm pack
   tar -tzf fe-fast-rusty-pic-0.1.0.tgz
   ```

3. **发布到 npm**
   ```bash
   # 发布 (首次发布)
   npm publish
   
   # 如果是 scoped package，需要指定 public
   npm publish --access public
   ```

### 版本管理

```bash
# 更新版本号
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0  
npm version major   # 0.1.0 -> 1.0.0

# 发布新版本
npm publish
```

### 验证发布

1. **检查 npm 页面**
   - 访问: https://www.npmjs.com/package/@fe-fast/rusty-pic
   - 确认包信息正确显示

2. **测试安装**
   ```bash
   # 在新目录测试安装
   mkdir test-install && cd test-install
   npm init -y
   npm install @fe-fast/rusty-pic
   
   # 测试导入
   node -e "console.log(require('@fe-fast/rusty-pic'))"
   ```

3. **测试 CLI**
   ```bash
   # 全局安装测试
   npm install -g @fe-fast/rusty-pic
   rusty-pic --help
   ```

## 🔧 发布清单

### 发布前检查

- [ ] 版本号已更新 (`package.json`)
- [ ] 构建成功 (`dist/` 和 `pkg/` 目录存在)
- [ ] 类型定义文件存在 (`*.d.ts`)
- [ ] CLI 工具可执行
- [ ] README.md 内容准确
- [ ] LICENSE 文件存在
- [ ] `.npmignore` 配置正确

### 发布后验证

- [ ] npm 页面显示正常
- [ ] 包可以正常安装
- [ ] 导入和使用正常
- [ ] CLI 工具工作正常
- [ ] 类型定义正确

## 🚨 注意事项

1. **包名**: 使用 `@fe-fast/rusty-pic` (scoped package)
2. **访问权限**: 设置为 `public` (在 `publishConfig` 中)
3. **文件包含**: 只包含必要的文件 (通过 `files` 字段控制)
4. **版本管理**: 遵循语义化版本控制 (semver)

## 🔄 更新发布流程

```bash
# 1. 开发完成后
git add .
git commit -m "feat: add new feature"

# 2. 更新版本
npm version patch

# 3. 构建
pnpm run build

# 4. 发布
npm publish

# 5. 推送到 git
git push origin main --tags
```

## 📊 发布统计

发布后可以通过以下方式查看统计：

```bash
# 查看包信息
npm info @fe-fast/rusty-pic

# 查看下载统计
npm info @fe-fast/rusty-pic --json | jq .downloads
```

或访问: https://npmcharts.com/compare/@fe-fast/rusty-pic