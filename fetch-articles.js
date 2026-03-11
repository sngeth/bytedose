const https = require('https');
const fs = require('fs');

// arXiv API configuration
const ARXIV_API = 'https://export.arxiv.org/api/query';

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

function generateEducationalContent(article) {
  return new Promise((resolve, reject) => {
    const prompt = `You are an expert computer science educator creating engaging educational content. Your goal is to make complex research accessible and interesting.

Paper Title: ${article.title}
Categories: ${article.categories.join(', ')}
Abstract: ${article.summary}

Generate a JSON response with the following structure:
{
  "whatIsThisAbout": "3-4 sentences explaining what this paper does. Use concrete examples or analogies when possible. Avoid jargon.",
  "problemSolved": "2-3 sentences explaining the real-world problem. What doesn't work well today? Why is this hard? Be specific.",
  "keyInnovation": "2-3 sentences on the main contribution. What's new or different about this approach compared to existing methods?",
  "howItWorks": [
    // 4-6 bullet points explaining the approach
    // Start each with an action verb
    // Include technical details but explain them clearly
    // Show the progression from input to output
  ],
  "whyItMatters": "2-3 sentences on practical impact. What real applications could benefit? What becomes possible now that wasn't before? Be concrete.",
  "realWorldAnalogy": "1-2 sentences comparing this to something from everyday life to build intuition",
  "prerequisites": [
    // 4-5 specific prerequisite concepts
    // Order from most fundamental to most advanced
  ],
  "keyTerms": [
    {"term": "exact term from paper", "definition": "Clear 1-2 sentence definition with an example if helpful"},
    // Extract 5-7 actual technical terms from the abstract
  ],
  "visualConcept": "Detailed description of a diagram showing data flow or system architecture. Specify boxes, arrows, and labels.",
  "limitations": "1-2 sentences on what this approach doesn't solve or trade-offs made",
  "relatedTopics": [
    // 4-5 specific related areas or techniques
  ]
}

IMPORTANT:
- Extract specific technical details from the abstract, not generic descriptions
- Use concrete examples where possible
- Explain WHY things work, not just WHAT they do
- Make it engaging for someone learning this topic`;

    const requestData = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          // Check for API errors first
          if (response.type === 'error') {
            reject(new Error(`API Error: ${response.error.message}`));
            return;
          }

          if (response.content && response.content[0] && response.content[0].text) {
            const text = response.content[0].text;
            // Extract JSON from potential markdown code blocks
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const educationalContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
              resolve(educationalContent);
            } else {
              reject(new Error('No valid JSON found in response'));
            }
          } else {
            // Log the actual response for debugging
            console.error('Full API response:', JSON.stringify(response, null, 2));
            reject(new Error('Unexpected API response format'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
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

  // Generate educational content
  console.log('📚 Generating educational content with Claude...\n');
  let educationalContent = null;
  try {
    educationalContent = await generateEducationalContent(topArticle);
    console.log('✅ Educational content generated\n');
  } catch (err) {
    console.error('⚠️  Failed to generate educational content:', err.message);
    console.log('   Continuing without educational content...\n');
  }

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

  // Save educational content to separate file if available
  if (educationalContent) {
    const learnFile = `${archiveDir}/${output.date}-learn.json`;
    const learnData = {
      date: output.date,
      articleId: topArticle.id,
      articleTitle: topArticle.title,
      content: educationalContent
    };
    fs.writeFileSync(learnFile, JSON.stringify(learnData, null, 2));
    console.log(`✅ Saved educational content to ${learnFile}\n`);
  }

  // Generate archive index
  const archiveFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.json') && !f.includes('-learn'))
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
