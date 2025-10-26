# Deployment Guide

## Deploying to GitHub Pages

### Prerequisites

Before deploying, make sure:
1. GitHub Pages is enabled in your repository settings
2. The repository is configured to use GitHub Actions as the source for GitHub Pages

### Automatic Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically builds and deploys the application.

**To enable automatic deployment:**

1. Go to your repository settings on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Build and deployment**, select **Source**: GitHub Actions
4. Push changes to the `main` branch
5. The workflow will automatically build and deploy your site

The workflow runs on:
- Every push to the `main` branch
- Manual trigger via the Actions tab

### Manual Deployment

If you prefer to deploy manually:

1. **Build the application:**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy the `dist/` folder:**
   - Option A: Copy the contents of `dist/` to your hosting provider
   - Option B: Use GitHub Pages by pushing the `dist/` folder to a `gh-pages` branch
   - Option C: Use the GitHub web interface to upload the files

### Verification

After deployment, your site will be available at:
- `https://<username>.github.io/website.github.io/`

Or if using a custom domain, configure it in the repository settings.

### Troubleshooting

**Issue**: Site shows 404 or blank page
- **Solution**: Check that the `base` path in `vite.config.ts` matches your repository structure
- **Solution**: Verify GitHub Pages is enabled and pointing to the correct source

**Issue**: Assets not loading
- **Solution**: Ensure relative paths are used (base: './' in vite.config.ts)
- **Solution**: Clear browser cache and try again

**Issue**: GitHub Actions workflow fails
- **Solution**: Check the Actions tab for error logs
- **Solution**: Verify node version compatibility in the workflow file
- **Solution**: Ensure all dependencies are listed in package.json
