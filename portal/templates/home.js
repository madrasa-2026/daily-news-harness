const { renderLayout, formatBengaliDate } = require('./layout');

function renderHome(articles = []) {
  const leadStory = articles[0] || {
    title: 'জনবার্তা ডিজিটাল নিউজ পোর্টালে স্বাগতম',
    summary: 'সর্বশেষ তাজা খবর ও বিশ্লেষণ পেতে সঙ্গে থাকুন। প্রতি ঘণ্টায় আপডেট হচ্ছে জনবার্তা।',
    category: 'বিশেষ',
    slug: 'welcome-to-jonobarta',
    publishedAt: new Date().toISOString(),
    photoUrl: '/images/logo.svg',
    cardUrl: '/images/logo.svg'
  };

  const sideStories = articles.slice(1, 4);
  const gridStories = articles.slice(4);

  const bodyHtml = `
    <!-- Breaking Ticker -->
    <div class="ticker-wrap">
      <span class="ticker-title">⚡ সর্বশেষ</span>
      <div class="ticker-content">
        ${articles.slice(0, 5).map(a => `
          <a href="/news/${a.slug}">🔹 ${a.title}</a> &nbsp;&nbsp;&nbsp;&nbsp;
        `).join('')}
      </div>
    </div>

    <main class="main-wrapper">
      
      <!-- Hero Grid Section -->
      <section class="hero-grid">
        
        <!-- Main Lead Story -->
        <article class="lead-card">
          <div class="lead-img-wrap">
            <a href="/news/${leadStory.slug}">
              <img src="${leadStory.cardUrl || leadStory.photoUrl || '/images/logo.svg'}" alt="${leadStory.title}" loading="eager">
            </a>
            <span class="category-tag">${leadStory.category || 'প্রধান সংবাদ'}</span>
          </div>
          <div class="lead-body">
            <h1 class="lead-title">
              <a href="/news/${leadStory.slug}">${leadStory.title}</a>
            </h1>
            <p class="lead-summary">${leadStory.summary || ''}</p>
            <div class="card-meta">
              <span>🕒 ${formatBengaliDate(leadStory.publishedAt)}</span>
              <span>•</span>
              <span>✍️ জনবার্তা অনলাইন ডেস্ক</span>
            </div>
          </div>
        </article>

        <!-- Sidebar Top 3 Stories -->
        <aside class="sidebar-list">
          <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.2rem; color: var(--primary-dark); margin-bottom: 0.25rem;">
            📌 আলোচিত খবর
          </div>
          ${sideStories.map(story => `
            <div class="side-news-card">
              <div class="side-thumb">
                <a href="/news/${story.slug}">
                  <img src="${story.cardUrl || story.photoUrl || '/images/logo.svg'}" alt="${story.title}" loading="lazy">
                </a>
              </div>
              <div class="side-info">
                <div style="font-size: 0.75rem; color: var(--accent); font-weight: 700; margin-bottom: 2px;">
                  ${story.category || 'জাতীয়'}
                </div>
                <h3 class="side-title">
                  <a href="/news/${story.slug}">${story.title}</a>
                </h3>
                <div style="font-size: 0.75rem; color: #94a3b8;">
                  ${formatBengaliDate(story.publishedAt)}
                </div>
              </div>
            </div>
          `).join('')}
        </aside>

      </section>

      <!-- AdSense Top Banner Slot -->
      <div class="ad-slot">
        📢 বিজ্ঞাপন স্থান (AdSense Responsive Banner Slot)
      </div>

      <!-- Latest News Section -->
      <div class="section-header">
        <h2 class="section-title">📰 সাম্প্রতিক সংবাদ</h2>
        <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600;">মোট ${articles.length} টি সংবাদ</span>
      </div>

      <!-- News Grid -->
      <div class="news-grid">
        ${(gridStories.length > 0 ? gridStories : articles).map(story => `
          <div class="grid-card">
            <a href="/news/${story.slug}">
              <img src="${story.cardUrl || story.photoUrl || '/images/logo.svg'}" alt="${story.title}" class="grid-img" loading="lazy">
            </a>
            <div class="grid-body">
              <div style="font-size: 0.8rem; color: var(--primary); font-weight: 700; margin-bottom: 4px;">
                ${story.category || 'সংবাদ'}
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

    </main>
  `;

  return renderLayout({
    title: 'জনবার্তা - সত্য ও ন্যায়ের নির্ভীক কণ্ঠ | Jonobarta',
    description: leadStory.title ? `${leadStory.title} - জনবার্তা ডিজিটাল নিউজ পোর্টাল` : 'জনবার্তা ডিজিটাল নিউজ পোর্টাল',
    ogImage: leadStory.cardUrl || leadStory.photoUrl || '/images/logo.svg',
    ogUrl: '/',
    activeCategory: '/',
    body: bodyHtml
  });
}

module.exports = { renderHome };
