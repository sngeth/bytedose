# ByteDose Deployment Guide

## Prerequisites

- GitHub account
- Git installed locally

## Deployment Steps

### 1. Create GitHub Repository

```bash
# Create a new public repository on GitHub
# Repository name: bytedose
```

### 2. Initialize and Push

```bash
cd bytedose-site
git init
git add -A
git commit -m "Initial commit: ByteDose site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bytedose.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to repository **Settings**
2. Navigate to **Pages** section
3. Under "Source", select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**

Your site will be live at: `https://YOUR_USERNAME.github.io/bytedose/`

### 4. Verify GitHub Actions

1. Go to the **Actions** tab in your repository
2. The workflow "Daily Article Update" should be visible
3. Click "Run workflow" to test it manually
4. After it completes, verify:
   - `latest-article.json` is updated
   - Archive files are created in `archive/`
   - `archive-index.json` is updated

## Automatic Updates

The GitHub Action runs daily at 7:00 AM UTC automatically. No further action needed!

## Customization

### Change Update Time

Edit `.github/workflows/daily-update.yml`:

```yaml
schedule:
  - cron: '0 14 * * *'  # 2 PM UTC instead of 7 AM
```

### Modify Search Categories

Edit `fetch-articles.js` and update the `SEARCH_CATEGORIES` array.

## Troubleshooting

**GitHub Pages not working?**
- Ensure repository is public (private repos require GitHub Pro)
- Check that Pages is enabled in Settings
- Wait 2-3 minutes after enabling Pages

**Articles not updating?**
- Check Actions tab for workflow run status
- Verify the workflow has permissions to push (Settings → Actions → General → Workflow permissions)
- Ensure "Read and write permissions" is selected

## Manual Update

To manually fetch a new article:

```bash
node fetch-articles.js
git add -A
git commit -m "Manual update: $(date +'%Y-%m-%d')"
git push
```
