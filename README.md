# ByteDose

Daily dose of cutting-edge computer science research from arXiv.

## Features

- 🔬 Automatically fetches top CS papers from arXiv daily
- 📊 Scores papers based on recency, keywords, and impact
- 🎯 Focuses on: ML, algorithms, systems, NLP, computer vision, security
- 📦 Archives all daily articles
- 🚀 Deploys to GitHub Pages automatically

## How It Works

1. **Daily Search**: Searches arXiv across 8 CS categories
2. **Smart Scoring**: Prioritizes recent papers with practical improvements
3. **Auto-Archive**: Saves each day's article to permanent archive
4. **GitHub Actions**: Runs automatically at 7 AM UTC daily

## Local Usage

```bash
node fetch-articles.js
```

This will:
- Search arXiv for recent CS papers
- Score and rank them
- Save the top article to `latest-article.json`
- Archive it to `archive/YYYY-MM-DD.json`
- Update `archive-index.json`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions.

## Technology

- Pure JavaScript (Node.js for fetching)
- Static HTML/CSS
- arXiv API
- GitHub Pages
- GitHub Actions

## License

MIT
