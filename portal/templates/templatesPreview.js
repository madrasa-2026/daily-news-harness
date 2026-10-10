const { renderLayout } = require('./layout');

function renderTemplatesPage(activeTemplate = 'bold-headline', availableTemplates = {}) {
  const templateMeta = {
    'bold-headline': {
      name: 'বোল্ড হেডলাইন',
      enName: 'Bold Headline (Al Jazeera Style)',
      desc: 'ক্রিমসন রেড ব্যাকগ্রাউন্ড, সুনির্দিষ্ট ক্যাটাগরি ব্যাজ এবং উচ্চ-প্রভাবশালী শিরোনাম।',
      bestFor: 'জাতীয়, রাজনীতি ও শীর্ষ ব্রেকিং খবর',
      preview: '/cards/preview_bold-headline.png'
    },
    'image-dominant': {
      name: 'ইমেজ ডমিন্যান্ট',
      enName: 'Image Dominant (BBC Lower-Third)',
      desc: 'পূর্ণাঙ্গ ব্যাকগ্রাউন্ড ফটোগ্রাফির ওপর ডার্ক গ্রেডিয়েন্ট ও লোয়ার-থার্ড টিভি নিউজ বার।',
      bestFor: 'এক্সক্লুসিভ ফটো, আন্তর্জাতিক, বিনোদন ও খেলার খবর',
      preview: '/cards/preview_image-dominant.png'
    },
    'minimal': {
      name: 'মিনিমালিস্ট লাইট',
      enName: 'Minimal Clean Editorial',
      desc: 'হোয়াইট-অফ-হোয়াইট মার্জিত ক্যানভাস, স্পষ্ট ডার্ক টাইপোগ্রাফি ও সূক্ষ্ম রেড বর্ডার।',
      bestFor: 'সম্পাদকীয়, কলাম, অর্থনীতি, সাহিত্য ও বিশ্লেষণ',
      preview: '/cards/preview_minimal.png'
    },
    'breaking-news': {
      name: 'ব্রেকিং ফ্ল্যাশ',
      enName: 'Breaking News Flash',
      desc: 'টেলিভিশন স্টুডিও ব্রডকাস্টের আদলে লাল হেডলাইন বার ও হাই-কনট্রাস্ট ডার্ক ক্যানভাস।',
      bestFor: 'জরুরি ঘোষণা, দুর্ঘটনা ও তাৎক্ষণিক জরুরি নিউজ',
      preview: '/cards/preview_breaking-news.png'
    },
    'quote-style': {
      name: 'উদ্ধৃতি ও বক্তব্য',
      enName: 'Editorial Quote & Statement',
      desc: 'বিশিষ্ট ব্যক্তির উদ্ধৃতি ও স্টেটমেন্ট উপস্থাপনের জন্য কোটেশন মার্ক ও মার্জিত বার।',
      bestFor: 'রাজনৈতিক বিবৃতি, আদালতের রায়, সাক্ষাৎকার ও ভাষ্য',
      preview: '/cards/preview_quote-style.png'
    },
    'dark-premium': {
      name: 'ডার্ক প্রিমিয়াম',
      enName: 'Dark Obsidian & Gold',
      desc: 'অবসিডিয়ান স্লেট ব্যাকগ্রাউন্ড ও অ্যাম্বার গোল্ড ফিনিশিং সম্পন্ন লাক্সারি জার্নালিজম লুক।',
      bestFor: 'বিশেষ অনুসন্ধান, দীর্ঘ ফিচার ও গভীর তদন্ত',
      preview: '/cards/preview_dark-premium.png'
    }
  };

  const bodyHtml = `
  <main class="main-wrapper" style="max-width: 1240px; margin: 0 auto; padding: 2rem 1rem;">
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 2.5rem 2rem; border-radius: 12px; margin-bottom: 2.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
        <div>
          <span style="background: #d61f2c; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; display: inline-block; margin-bottom: 0.75rem;">১২০০×৬৩০ এইচডি কার্ড ইঞ্জিন</span>
          <h1 style="font-size: 2.2rem; font-weight: 800; margin: 0 0 0.5rem 0; font-family: 'Hind Siliguri', sans-serif;">জনবার্তা সোশ্যাল নিউজ কার্ড টেমপ্লেট গ্যালারি</h1>
          <p style="color: #cbd5e1; margin: 0; font-size: 1.05rem;">ফেসবুক ও সোশ্যাল মিডিয়ায় সর্বোচ্চ এনগেজমেন্ট অর্জনের জন্য স্বয়ংক্রিয়ভাবে তৈরি ৬টি পেশাদার টেমপ্লেট।</p>
        </div>
        <div style="background: rgba(255,255,255,0.08); padding: 1rem 1.5rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); text-align: right;">
          <div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">বর্তমান সক্রিয় টেমপ্লেট</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">
            ${templateMeta[activeTemplate]?.name || activeTemplate} <span style="font-size: 0.85rem; color: #cbd5e1;">(${activeTemplate})</span>
          </div>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 2rem;">
      ${Object.keys(templateMeta).map(key => {
        const item = templateMeta[key];
        const isActive = key === activeTemplate;
        return `
        <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: ${isActive ? '3px solid #d61f2c' : '1px solid #e2e8f0'}; box-shadow: ${isActive ? '0 10px 25px -5px rgba(214, 31, 44, 0.25)' : '0 4px 6px -1px rgba(0,0,0,0.05)'}; display: flex; flex-direction: column;">
          <div style="position: relative; background: #000000; aspect-ratio: 1200 / 630; overflow: hidden;">
            <img src="${item.preview}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy">
            ${isActive ? `
              <div style="position: absolute; top: 12px; right: 12px; background: #d61f2c; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                ✓ সক্রিয় (ACTIVE)
              </div>
            ` : ''}
          </div>
          <div style="padding: 1.5rem; display: flex; flex-direction: column; flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
              <h3 style="font-size: 1.35rem; font-weight: 700; margin: 0; color: #0f172a;">${item.name}</h3>
              <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: #475569;">${key}</code>
            </div>
            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1rem 0;">${item.desc}</p>
            <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 0.85rem; color: #64748b;">
                <strong>উপযুক্ত:</strong> ${item.bestFor}
              </div>
              <button onclick="setActiveTemplate('${key}')" style="background: ${isActive ? '#e2e8f0' : '#d61f2c'}; color: ${isActive ? '#64748b' : '#ffffff'}; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: ${isActive ? 'default' : 'pointer'}; font-family: 'Hind Siliguri', sans-serif;" ${isActive ? 'disabled' : ''}>
                ${isActive ? 'সক্রিয় আছে' : 'সক্রিয় করুন'}
              </button>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  </main>

  <script>
    async function setActiveTemplate(templateId) {
      try {
        const res = await fetch('/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: templateId })
        });
        const data = await res.json();
        if (data.success) {
          alert('কার্ড টেমপ্লেট সফলভাবে পরিবর্তন করা হয়েছে: ' + templateId);
          window.location.reload();
        } else {
          alert('ত্রুটি: ' + (data.error || 'টেমপ্লেট পরিবর্তন করা যায়নি'));
        }
      } catch (e) {
        alert('অনুরোধ ব্যর্থ হয়েছে: ' + e.message);
      }
    }
  </script>
  `;

  return renderLayout({
    title: 'নিউজ কার্ড টেমপ্লেট গ্যালারি | জনবার্তা',
    description: 'জনবার্তা সোশ্যাল মিডিয়ার জন্য ৬টি ১২০০×৬৩০ ব্র্যান্ডেড নিউজ কার্ড টেমপ্লেট।',
    ogUrl: '/templates',
    body: bodyHtml
  });
}

module.exports = {
  renderTemplatesPage
};
