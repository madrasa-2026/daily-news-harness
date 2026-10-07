const { renderLayout, formatBengaliDate } = require('./layout');

function renderCategory(categoryName, articles = [], categorySlug = '') {
  const bodyHtml = `
    <main class="main-wrapper">
      <div class="section-header" style="margin-top: 1rem;">
        <h1 class="section-title">📂 বিভাগ: ${categoryName}</h1>
        <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 600;">মোট ${articles.length} টি সংবাদ</span>
      </div>

      ${articles.length === 0 ? `
        <div style="text-align: center; padding: 3rem 1rem; background: white; border-radius: var(--radius); border: 1px solid var(--border);">
          <p style="color: var(--text-muted); font-size: 1.1rem;">এই বিভাগে বর্তমানে কোনো সংবাদ নেই। শীঘ্রই নতুন সংবাদ যুক্ত হবে।</p>
          <a href="/" style="display: inline-block; margin-top: 1rem; background: var(--primary); color: white; padding: 0.5rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 700;">প্রচ্ছদে ফিরুন</a>
        </div>
      ` : `
        <div class="news-grid">
          ${articles.map(story => `
            <div class="grid-card">
              <a href="/news/${story.slug}">
                <img src="${story.cardUrl || story.photoUrl || '/images/logo.svg'}" alt="${story.title}" class="grid-img" loading="lazy">
              </a>
              <div class="grid-body">
                <div style="font-size: 0.8rem; color: var(--primary); font-weight: 700; margin-bottom: 4px;">
                  ${story.category || categoryName}
                </div>
                <h3 class="grid-title">
                  <a href="/news/${story.slug}">${story.title}</a>
                </h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${story.summary || ''}
                </p>
                <div class="card-meta">
                  <span>${formatBengaliDate(story.publishedAt)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <!-- AdSense Bottom Slot -->
      <div class="ad-slot">
        📢 ক্যাটাগরি বিজ্ঞাপন স্থান (AdSense Category Banner Slot)
      </div>
    </main>
  `;

  return renderLayout({
    title: `${categoryName} সংবাদ - জনবার্তা | Jonobarta`,
    description: `${categoryName} বিভাগের সর্বশেষ তাজা খবর ও বিশ্লেষণ - জনবার্তা।`,
    ogUrl: `/category/${categorySlug || 'news'}`,
    activeCategory: `/category/${categorySlug}`,
    body: bodyHtml
  });
}

module.exports = { renderCategory };
