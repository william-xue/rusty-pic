# GitHub Pages Deployment Troubleshooting

## 🔧 Common Issues and Solutions

### 1. pnpm Lockfile Compatibility Issues

**Problem**: `ERR_PNPM_NO_LOCKFILE` or lockfile version mismatch

**Solution**:
- Ensure `packageManager` field in `package.json` matches the lockfile version
- Use the minimal workflow (`pages-minimal.yml`) which installs pnpm directly
- Current setup uses pnpm@9.15.0 to match lockfile version 9.0

### 2. System Dependencies Missing

**Problem**: Build fails with missing `nasm` or other system dependencies

**Solution**:
- The workflow includes system dependency installation:
  ```yaml
  - name: Install system dependencies
    run: |
      sudo apt-get update
      sudo apt-get install -y nasm
  ```

### 3. WASM Build Failures

**Problem**: Rust/WASM compilation errors

**Solution**:
- Limited to PNG features only to avoid C dependencies:
  ```bash
  wasm-pack build --target web --out-dir ../../pkg --features "png" crates/rusty-pic-wasm
  ```
- Ensures compatibility with GitHub Actions environment

### 4. Base URL Issues

**Problem**: Assets not loading on GitHub Pages

**Solution**:
- `vite.config.ts` automatically sets base URL for production:
  ```typescript
  base: process.env.NODE_ENV === 'production' ? '/rusty-pic/' : '/',
  ```

## 🚀 Active Workflows

### Current Active Workflow
- **File**: `.github/workflows/pages-minimal.yml`
- **Name**: "Minimal GitHub Pages Deploy"
- **Status**: ✅ Active

### Disabled Workflows
- `.github/workflows/pages-simple.yml` - Disabled (complex dependency setup)
- `.github/workflows/deploy.yml` - Disabled (conflicts with minimal workflow)

## 📋 Deployment Checklist

Before deployment, ensure:

1. **Repository Settings**:
   - [ ] Pages enabled in repository settings
   - [ ] Source set to "GitHub Actions"
   - [ ] Proper permissions granted to Actions

2. **Code Requirements**:
   - [ ] `packageManager` field in `package.json` matches pnpm version
   - [ ] WASM features limited to stable ones (PNG only)
   - [ ] Base URL configured for production builds

3. **Workflow Status**:
   - [ ] Only one deployment workflow enabled
   - [ ] All required system dependencies included
   - [ ] Proper Node.js and pnpm versions specified

## 🔍 Debugging Steps

If deployment still fails:

1. **Check Actions Tab**:
   - View detailed logs for each step
   - Look for specific error messages
   - Check which step is failing

2. **Verify Local Build**:
   ```bash
   pnpm install
   NODE_ENV=production pnpm run build
   ```

3. **Test Individual Steps**:
   ```bash
   # Test WASM build
   wasm-pack build --target web --out-dir ../../pkg --features "png" crates/rusty-pic-wasm
   
   # Test library build
   pnpm run build:lib
   
   # Test frontend build
   NODE_ENV=production pnpm run build
   ```

## 📞 Getting Help

If issues persist:
1. Check the Actions logs for specific error messages
2. Verify all repository settings are correct
3. Ensure the workflow has proper permissions
4. Test the build process locally first

## 🎯 Expected Results

After successful deployment:
- Site available at: `https://[username].github.io/rusty-pic/`
- All assets load correctly with `/rusty-pic/` prefix
- Image compression functionality works
- No 404 errors for static assets