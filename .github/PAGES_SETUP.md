# GitHub Pages Setup Instructions

To enable GitHub Pages deployment for this repository, follow these steps:

## 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Save the settings

## 2. Verify Permissions

Make sure the repository has the following permissions enabled:

- **Actions**: Read and write permissions
- **Pages**: Write permissions
- **Contents**: Read permissions

## 3. Environment Setup

The workflow will automatically create a `github-pages` environment. You can view deployment status in:

- **Actions** tab to see workflow runs
- **Environments** tab to see deployment history
- **Settings > Pages** to see the live URL

## 4. Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to the `public/` directory with your domain
2. Configure DNS settings with your domain provider
3. Update the base URL in `vite.config.ts` if needed

## 5. Troubleshooting

If deployment fails:

1. Check the Actions tab for error logs
2. Ensure all required secrets are set (if any)
3. Verify that Pages is enabled in repository settings
4. Check that the workflow has proper permissions

## Expected URL

Once deployed, your site will be available at:
`https://[username].github.io/rusty-pic/`

Replace `[username]` with your GitHub username.