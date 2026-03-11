const https = require('https');
const fs = require('fs');

// arXiv API configuration
const ARXIV_API = 'https://export.arxiv.org/api/query';

// Search categories for CS optimization and advances
const SEARCH_CATEGORIES = [
  'machine learning OR deep learning OR neural networks',
  'algorithms OR optimization OR complexity',
  'distributed systems OR scalability OR performance',
  'programming languages OR compilers OR type systems',
  'computer vision OR image processing',
  'natural language processing OR NLP',
  'systems OR operating systems OR architecture',
  'security OR cryptography OR privacy'
];

// Keywords that indicate practical improvements/advances
const OPTIMIZATION_KEYWORDS = [
  'faster', 'efficient', 'scalable', 'improved', 'novel',
  'optimization', 'performance', 'breakthrough', 'state-of-the-art',
  'practical', 'real-world', 'outperforms', 'achieves'
];

function searchArxiv(query, maxResults = 5) {
  return new Promise((resolve, reject) => {
    const searchQuery = encodeURIComponent(`all:${query} AND cat:cs.*`);
    const sortBy = 'submittedDate';
    const sortOrder = 'descending';
    const url = `${ARXIV_API}?search_query=${searchQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}&max_results=${maxResults}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseArxivXML(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const getId = /<id>(.*?)<\/id>/.exec(entry);
    const getTitle = /<title>(.*?)<\/title>/.exec(entry);
    const getSummary = /<summary>(.*?)<\/summary>/.exec(entry);
    const getPublished = /<published>(.*?)<\/published>/.exec(entry);

    // Extract authors
    const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
    const authors = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    // Extract categories
    const categoryRegex = /<category term="(.*?)"[\s\S]*?\/>/g;
    const categories = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    if (getId && getTitle && getSummary) {
      const arxivId = getId[1].split('/abs/')[1];
      entries.push({
        id: arxivId,
        title: getTitle[1].replace(/\s+/g, ' ').trim(),
        summary: getSummary[1].replace(/\s+/g, ' ').trim(),
        authors: authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' et al.' : ''),
        published: getPublished ? getPublished[1] : '',
        categories: categories,
        url: `https://arxiv.org/abs/${arxivId}`
      });
    }
  }

  return entries;
}

function scoreArticle(article) {
  let score = 0;
  const lowerTitle = article.title.toLowerCase();
  const lowerSummary = article.summary.toLowerCase();
  const combined = lowerTitle + ' ' + lowerSummary;

  // Check for optimization keywords
  OPTIMIZATION_KEYWORDS.forEach(keyword => {
    if (combined.includes(keyword)) {
      score += 1;
    }
  });

  // Bonus for recent papers (within 30 days)
  const publishedDate = new Date(article.published);
  const daysSincePublished = (Date.now() - publishedDate) / (1000 * 60 * 60 * 24);
  if (daysSincePublished <= 30) {
    score += 3;
  } else if (daysSincePublished <= 90) {
    score += 2;
  } else if (daysSincePublished <= 180) {
    score += 1;
  }

  // Bonus for certain high-impact categories
  const highImpactCategories = ['cs.LG', 'cs.AI', 'cs.CV', 'cs.CL', 'cs.DS'];
  if (article.categories.some(cat => highImpactCategories.includes(cat))) {
    score += 2;
  }

  return score;
}

async function main() {
  console.log('🔍 Searching arXiv for CS articles...\n');

  const allArticles = [];
  const seenIds = new Set();

  // Search across all categories
  for (const category of SEARCH_CATEGORIES) {
    console.log(`Searching: ${category}...`);
    try {
      const xml = await searchArxiv(category, 5);
      const articles = parseArxivXML(xml);

      articles.forEach(article => {
        if (!seenIds.has(article.id)) {
          seenIds.add(article.id);
          allArticles.push(article);
        }
      });
    } catch (err) {
      console.error(`Error searching ${category}:`, err.message);
    }
  }

  console.log(`\n📚 Found ${allArticles.length} unique articles\n`);

  if (allArticles.length === 0) {
    console.log('❌ No articles found');
    return;
  }

  // Score and sort articles
  const scoredArticles = allArticles.map(article => ({
    ...article,
    score: scoreArticle(article)
  }));

  scoredArticles.sort((a, b) => b.score - a.score);

  const topArticle = scoredArticles[0];
  console.log('🏆 Top article selected:');
  console.log(`   Title: ${topArticle.title}`);
  console.log(`   Authors: ${topArticle.authors}`);
  console.log(`   Score: ${topArticle.score}`);
  console.log(`   Published: ${topArticle.published.split('T')[0]}`);
  console.log(`   Summary: ${topArticle.summary.substring(0, 100)}...`);
  console.log(`   URL: ${topArticle.url}\n`);

  // Save to JSON
  const output = {
    date: new Date().toISOString().split('T')[0],
    article: topArticle,
    alternates: scoredArticles.slice(1, 5)
  };

  fs.writeFileSync('latest-article.json', JSON.stringify(output, null, 2));
  console.log('✅ Saved to latest-article.json\n');

  // Save to archive
  const archiveDir = 'archive';
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
  }
  const archiveFile = `${archiveDir}/${output.date}.json`;
  fs.writeFileSync(archiveFile, JSON.stringify(output, null, 2));
  console.log(`✅ Saved to ${archiveFile}\n`);

  // Generate archive index
  const archiveFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  const archiveIndex = {
    lastUpdated: new Date().toISOString(),
    articles: archiveFiles.map(file => {
      const data = JSON.parse(fs.readFileSync(`${archiveDir}/${file}`, 'utf8'));
      return {
        date: data.date,
        article: {
          title: data.article.title,
          authors: data.article.authors,
          published: data.article.published,
          url: data.article.url
        }
      };
    })
  };

  fs.writeFileSync('archive-index.json', JSON.stringify(archiveIndex, null, 2));
  console.log('✅ Updated archive-index.json\n');

  return output;
}

main().catch(console.error);
