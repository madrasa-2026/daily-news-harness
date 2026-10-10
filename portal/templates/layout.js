function formatBengaliDate(dateInput) {
  const d = new Date(dateInput || Date.now());
  const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  
  const toBanglaNum = n => String(n).split('').map(c => banglaDigits[c] || c).join('');
  
  const day = toBanglaNum(d.getDate());
  const month = banglaMonths[d.getMonth()];
  const year = toBanglaNum(d.getFullYear());
  
  return `${day} ${month} ${year}`;
}

function renderLayout({
  title = 'জনবার্তা - সত্য ও ন্যায়ের নির্ভীক কণ্ঠ | Jonobarta',
  description = 'জনবার্তা - বাংলাদেশের রাজনীতি, অর্থনীতি, রাষ্ট্র সংস্কার ও জাতীয় সংবাদের শীর্ষস্থানীয় ডিজিটাল নিউজ পোর্টাল।',
  ogImage = '/images/logo.svg',
  ogUrl = '/',
  canonicalUrl = '/',
  activeCategory = '',
  body = ''
}) {
  const categories = [
    { name: 'প্রচ্ছদ', slug: '/' },
    { name: 'জাতীয়', slug: '/category/national' },
    { name: 'রাজনীতি', slug: '/category/politics' },
    { name: 'অর্থনীতি', slug: '/category/economy' },
    { name: 'আইন ও আদালত', slug: '/category/judiciary' },
    { name: 'সংস্কার ও রাষ্ট্র', slug: '/category/reform' },
    { name: 'ক্যাম্পাস ও তরুণ', slug: '/category/campus' },
    { name: 'আন্তর্জাতিক', slug: '/category/international' }
  ];

  const fullOgImage = ogImage.startsWith('http') ? ogImage : `https://daily-news-harness.onrender.com${ogImage}`;
  const fullOgUrl = ogUrl.startsWith('http') ? ogUrl : `https://daily-news-harness.onrender.com${ogUrl}`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${fullOgUrl}">
  
  <!-- OpenGraph / Facebook Sharing -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="জনবার্তা | Jonobarta">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${fullOgImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${fullOgUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${fullOgImage}">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/images/logo.svg">
  
  <!-- Main Stylesheet -->
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>

  <!-- Top Announcement Bar -->
  <div class="top-bar">
    <div class="date-time">📅 ${formatBengaliDate(new Date())} | ঢাকা</div>
    <div>
      <span class="live-badge">🔴 লাইভ ২৪/৭</span>
    </div>
  </div>

  <!-- Main Header -->
  <header class="site-header">
    <div class="header-main">
      <a href="/" title="জনবার্তা">
        <img src="/images/logo.svg" alt="জনবার্তা - Jonobarta" class="brand-logo">
      </a>
      <div style="display: flex; gap: 8px; align-items: center;">
        <a href="/rss" title="RSS Feed" style="color: #64748b; text-decoration: none; font-size: 0.9rem; font-weight: 600;">📡 RSS</a>
        <a href="/trigger" class="live-badge" style="text-decoration: none; font-size: 0.8rem; background: var(--primary);">⚡ অন-ডিমান্ড নিউজ</a>
      </div>
    </div>

    <!-- Navigation Bar -->
    <nav class="nav-bar">
      <div class="nav-container">
        ${categories.map(c => `
          <a href="${c.slug}" class="nav-item ${activeCategory === c.slug ? 'active' : ''}">${c.name}</a>
        `).join('')}
      </div>
    </nav>
  </header>

  <!-- Dynamic Body Content -->
  ${body}

  <!-- Footer -->
  <footer class="site-footer">
    <div class="footer-container">
      <div>
        <img src="/images/logo.svg" alt="জনবার্তা" class="footer-logo" style="filter: brightness(0) invert(1);">
        <p style="font-size: 0.95rem; line-height: 1.6; margin-top: 0.5rem; color: #94a3b8;">
          জনবার্তা - সত্য, ন্যায় ও জনগণের পক্ষের স্বাধীন ডিজিটাল সংবাদমাধ্যম। রাষ্ট্র সংস্কার, সুশাসন, অর্থনীতি ও জাতীয় নিরাপত্তার নির্ভীক সংবাদ বিশ্লেষণ।
        </p>
      </div>
      <div class="footer-links">
        <h4>বিভাগসমূহ</h4>
        <ul>
          <li><a href="/category/national">জাতীয় সংবাদ</a></li>
          <li><a href="/category/politics">রাজনীতি ও নির্বাচন</a></li>
          <li><a href="/category/economy">অর্থনীতি ও বাণিজ্য</a></li>
          <li><a href="/category/judiciary">আদালত ও আইন</a></li>
          <li><a href="/category/reform">রাষ্ট্র সংস্কার</a></li>
        </ul>
      </div>
      <div class="footer-links">
        <h4>যোগাযোগ ও তথ্য</h4>
        <ul>
          <li><a href="/">আমাদের সম্পর্কে</a></li>
          <li><a href="/">সম্পাদকীয় নীতিমালা</a></li>
          <li><a href="/rss">আরএসএস ফিড (RSS)</a></li>
          <li><a href="/status">সিস্টেম স্ট্যাটাস</a></li>
        </ul>
      </div>
    </div>
    <div class="copyright-bar">
      &copy; ${new Date().getFullYear()} জনবার্তা (Jonobarta). সর্বস্বত্ব সংরক্ষিত।
    </div>
  </footer>

  <!-- Cloudflare Web Analytics Beacon -->
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "jonobarta-analytics-beacon-2026"}'></script>
  <!-- End Cloudflare Web Analytics Beacon -->

</body>
</html>`;
}

module.exports = { renderLayout, formatBengaliDate };
