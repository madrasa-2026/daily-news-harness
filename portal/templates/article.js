const { renderLayout, formatBengaliDate } = require('./layout');

function renderArticle(article, relatedArticles = []) {
  if (!article) {
    return renderLayout({
      title: 'সংবাদটি পাওয়া যায়নি - জনবার্তা',
      body: `
        <div class="main-wrapper" style="text-align: center; padding: 4rem 1rem;">
          <h1 style="font-family: var(--font-heading); color: var(--accent); margin-bottom: 1rem;">৪-০-৪: সংবাদটি পাওয়া যায়নি</h1>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">দুঃখিত, আপনি যে সংবাদটি খুঁজছেন তা মুছে ফেলা হয়েছে অথবা লিংকটি ভুল।</p>
          <a href="/" style="background: var(--primary); color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 700;">🏠 প্রচ্ছদে ফিরে যান</a>
        </div>
      `
    });
  }

  const shareUrl = encodeURIComponent(`https://daily-news-harness.onrender.com/news/${article.slug}`);
  const shareTitle = encodeURIComponent(article.title);

  const paragraphsHtml = (article.paragraphs && article.paragraphs.length > 0)
    ? article.paragraphs.map(p => `<p>${p}</p>`).join('')
    : `<p>${article.summary || article.fullContent || ''}</p>`;

  const bodyHtml = `
    <main class="main-wrapper">
      <article class="article-wrapper">
        
        <!-- Breadcrumb & Category -->
        <div class="article-header">
          <span class="article-category">${article.category || 'জাতীয়'}</span>
          <h1 class="article-h1">${article.title}</h1>
          
          <div class="article-meta-bar">
            <div>
              <span>🕒 প্রকাশিত: ${formatBengaliDate(article.publishedAt)}</span>
              <span style="margin: 0 6px;">•</span>
              <span>✍️ ডেস্ক রিপোর্ট</span>
            </div>
            <div>
              <span>👁️ ${article.views || 1} বার পঠিত</span>
            </div>
          </div>
        </div>

        <!-- Social Share Bar -->
        <div class="share-bar">
          <span style="font-weight: 700; font-size: 0.9rem; color: #475569;">শেয়ার করুন:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" class="share-btn share-fb">
            <span>Facebook</span>
          </a>
          <a href="https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}" target="_blank" rel="noopener" class="share-btn share-wa">
            <span>WhatsApp</span>
          </a>
          <a href="https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}" target="_blank" rel="noopener" class="share-btn share-tw">
            <span>X (Twitter)</span>
          </a>
        </div>

        <!-- News Banner / Card Image -->
        ${(article.cardUrl || article.photoUrl) ? `
          <div style="margin: 1.5rem 0;">
            <img src="${article.cardUrl || article.photoUrl}" alt="${article.title}" class="article-banner-card">
          </div>
        ` : ''}

        <!-- Speaker Quote Box (if available) -->
        ${article.speakerQuote ? `
          <div class="speaker-quote-box">
            🎙️ <strong>বক্তব্য:</strong> "${article.speakerQuote}"
          </div>
        ` : ''}

        <!-- Full Article Content -->
        <div class="article-content">
          ${paragraphsHtml}
        </div>

        <!-- Source Attribution Box -->
        <div class="source-box">
          <strong>📌 তথ্যসূত্র:</strong> ${article.sourceFeed || 'অনলাইন ডেস্ক'}
          ${article.sourceUrl ? `<br/>🔗 <strong>মূল সংবাদের লিংক:</strong> <a href="${article.sourceUrl}" target="_blank" rel="noopener nofollow">${article.sourceUrl}</a>` : ''}
        </div>

        <!-- In-Article Ad Slot -->
        <div class="ad-slot" style="margin-top: 2rem;">
          📢 ইন-আর্টিকেল বিজ্ঞাপন স্থান (AdSense In-Article Ad Slot)
        </div>

        <!-- Tags List -->
        ${(article.tags && article.tags.length > 0) ? `
          <div style="margin-top: 1.5rem; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 700; color: #64748b;">ট্যাগ:</span>
            ${article.tags.map(t => `
              <span style="background: #f1f5f9; color: #475569; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">#${t}</span>
            `).join('')}
          </div>
        ` : ''}

      </article>

      <!-- Related News Section -->
      ${relatedArticles.length > 0 ? `
        <div style="max-width: 860px; margin: 2rem auto;">
          <div class="section-header">
            <h3 class="section-title">📰 আরও খবর</h3>
          </div>
          <div class="news-grid">
            ${relatedArticles.slice(0, 3).map(r => `
              <div class="grid-card">
                <a href="/news/${r.slug}">
                  <img src="${r.cardUrl || r.photoUrl || '/images/logo.svg'}" alt="${r.title}" class="grid-img" loading="lazy">
                </a>
                <div class="grid-body">
                  <h4 class="grid-title">
                    <a href="/news/${r.slug}">${r.title}</a>
                  </h4>
                  <div class="card-meta">
                    <span>${formatBengaliDate(r.publishedAt)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </main>
  `;

  return renderLayout({
    title: `${article.title} - জনবার্তা | Jonobarta`,
    description: article.summary || article.title,
    ogImage: article.cardUrl || article.photoUrl || '/images/logo.svg',
    ogUrl: `/news/${article.slug}`,
    activeCategory: `/category/${(article.category || '').toLowerCase()}`,
    body: bodyHtml
  });
}

module.exports = { renderArticle };
