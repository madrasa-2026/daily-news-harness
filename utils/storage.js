const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function generateSlug(text) {
  if (!text) return 'news-' + Date.now();
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-z0-9\s-]/g, '') // Keep Bengali, English alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100) + '-' + Date.now().toString().slice(-4);
}

function loadArticles() {
  try {
    if (!fs.existsSync(ARTICLES_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(ARTICLES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[STORAGE] Error loading articles:', e.message);
    return [];
  }
}

function saveArticle(articleData) {
  try {
    const articles = loadArticles();
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const slug = articleData.slug || generateSlug(articleData.title);
    
    const newArticle = {
      id,
      slug,
      title: articleData.title || '',
      category: articleData.category || 'জাতীয়',
      summary: articleData.summary || '',
      paragraphs: Array.isArray(articleData.paragraphs) ? articleData.paragraphs : (articleData.paragraphs ? [articleData.paragraphs] : [articleData.summary || '']),
      fullContent: articleData.fullContent || (Array.isArray(articleData.paragraphs) ? articleData.paragraphs.join('\n\n') : articleData.summary || ''),
      rewrittenPost: articleData.rewrittenPost || '',
      cardUrl: articleData.cardUrl || '',
      photoUrl: articleData.photoUrl || '',
      sourceFeed: articleData.sourceFeed || 'জনবার্তা অনলাইন ডেস্ক',
      sourceUrl: articleData.sourceUrl || articleData.link || '',
      speakerQuote: articleData.speakerQuote || null,
      tags: articleData.tags || ['জনবার্তা', 'বাংলাদেশ', articleData.category || 'সংবাদ'],
      views: 0,
      publishedAt: articleData.publishedAt || new Date().toISOString()
    };

    articles.unshift(newArticle);
    
    // Keep last 500 articles in active memory
    const trimmed = articles.slice(0, 500);
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    console.log(`[STORAGE] Saved article "${newArticle.title.slice(0, 40)}..." (ID: ${id}, Slug: ${slug})`);
    return newArticle;
  } catch (e) {
    console.error('[STORAGE] Error saving article:', e.message);
    throw e;
  }
}

function getArticles(limit = 30, page = 1) {
  const articles = loadArticles();
  const offset = (page - 1) * limit;
  return {
    articles: articles.slice(offset, offset + limit),
    total: articles.length,
    page,
    totalPages: Math.ceil(articles.length / limit)
  };
}

function getArticleBySlugOrId(identifier) {
  const articles = loadArticles();
  return articles.find(a => a.slug === identifier || a.id === identifier);
}

function getArticlesByCategory(category, limit = 20) {
  const articles = loadArticles();
  const filtered = articles.filter(a => (a.category || '').toLowerCase() === category.toLowerCase());
  return filtered.slice(0, limit);
}

function incrementViews(slugOrId) {
  try {
    const articles = loadArticles();
    const article = articles.find(a => a.slug === slugOrId || a.id === slugOrId);
    if (article) {
      article.views = (article.views || 0) + 1;
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf8');
    }
  } catch (e) {
    // Non-critical view counter failure
  }
}

module.exports = {
  generateSlug,
  loadArticles,
  saveArticle,
  getArticles,
  getArticleBySlugOrId,
  getArticlesByCategory,
  incrementViews
};
