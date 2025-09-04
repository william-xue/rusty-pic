# NPM_TOKEN 配置指南

## 🎯 什么是 NPM_TOKEN？

NPM_TOKEN 是 npm 提供的访问令牌，用于在自动化环境（如 GitHub Actions）中发布包到 npm 注册表。

## 📋 获取步骤

### 1. 登录 npm
访问 [https://www.npmjs.com](https://www.npmjs.com) 并登录

### 2. 创建访问令牌
```
npm 官网 → 头像 → Access Tokens → Generate New Token
```

### 3. 令牌配置
- **Token Type**: `Automation` (推荐用于 CI/CD)
- **Expiration**: `No expiration` 或选择较长期限
- **Packages**: 可以限制到 `@fe-fast/rusty-pic` 包

### 4. 复制令牌
⚠️ **重要**: 令牌只显示一次，立即复制保存！

## 🔧 GitHub 配置

### 1. 仓库设置路径
```
GitHub 仓库 → Settings → Secrets and variables → Actions
```

### 2. 添加 Secret
- **Name**: `NPM_TOKEN`
- **Value**: 粘贴 npm 令牌
- 点击 "Add secret"

## 🔍 验证配置

### 检查令牌权限
在 npm 官网的 Access Tokens 页面确认：
- ✅ Token 状态为 "Active"
- ✅ 有 "Automation" 或 "Publish" 权限
- ✅ 包含你的包名或组织

### 测试发布
可以手动触发 release workflow 来测试：
```bash
# 创建测试标签
git tag v0.2.1-test
git push origin v0.2.1-test
```

## 🚨 安全注意事项

1. **不要在代码中硬编码令牌**
2. **定期轮换令牌**（建议每 6-12 个月）
3. **使用最小权限原则**（只给必要的包权限）
4. **监控令牌使用情况**

## 🔧 故障排除

### 常见错误

#### 401 Unauthorized
```
npm ERR! 401 Unauthorized - PUT https://registry.npmjs.org/@fe-fast%2frusty-pic
```
**解决方案**: 检查 NPM_TOKEN 是否正确配置

#### 403 Forbidden
```
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/@fe-fast%2frusty-pic
```
**解决方案**: 检查令牌权限和包名权限

#### Token 过期
**解决方案**: 重新生成令牌并更新 GitHub Secret

### 调试命令

本地测试发布（不实际发布）：
```bash
# 使用 --dry-run 测试
npm publish --dry-run

# 检查包内容
npm pack
tar -tzf *.tgz
```

## 📞 获取帮助

如果遇到问题：
1. 检查 [npm 官方文档](https://docs.npmjs.com/creating-and-viewing-access-tokens)
2. 查看 GitHub Actions 日志
3. 确认包名和版本号正确