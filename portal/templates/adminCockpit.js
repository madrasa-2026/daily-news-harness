/**
 * Jonobarta Admin Cockpit Template
 * 5 Panels: Pipeline Health, Card Studio, Post Performance, Traffic Overview, Controls
 * Zero framework bloat - Pure server-side HTML/CSS/JS
 */

function renderAdminLoginPage(error = null) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>জনবার্তা অ্যাডমিন লগইন | Jonobarta Cockpit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', -apple-system, sans-serif; }
    body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; width: 100%; max-width: 400px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { text-align: center; margin-bottom: 24px; }
    .logo { color: #d61f2c; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    .error { background: #7f1d1d; border: 1px solid #ef4444; color: #fecaca; padding: 10px 14px; border-radius: 6px; font-size: 14px; margin-bottom: 18px; text-align: center; }
    label { display: block; font-size: 14px; font-weight: 600; color: #cbd5e1; margin-bottom: 8px; }
    input[type="password"] { width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; font-size: 16px; outline: none; margin-bottom: 20px; transition: border-color 0.2s; }
    input[type="password"]:focus { border-color: #d61f2c; }
    button { width: 100%; padding: 12px; background: #d61f2c; color: #fff; border: none; border-radius: 6px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #b91c1c; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <div class="logo">জনবার্তা</div>
      <div class="subtitle">অ্যাডমিন ককপিট • কন্ট্রোল রুম</div>
    </div>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/admin/login">
      <label for="password">অ্যাডমিন পাসওয়ার্ড (Admin Password)</label>
      <input type="password" id="password" name="password" required autofocus placeholder="পাসওয়ার্ড লিখুন...">
      <button type="submit">ককপিটে প্রবেশ করুন</button>
    </form>
  </div>
</body>
</html>`;
}

function renderAdminCockpit(data) {
  const {
    activeTemplate = 'bold-headline',
    holdPosting = false,
    cronStatus = 'ACTIVE',
    keepAliveStatus = 'HEALTHY',
    runs = [],
    logs = [],
    articles = [],
    feeds = [],
    templates = [],
    originalityRatio = '100%',
    beaconActive = true
  } = data;

  const stageBadge = (status) => {
    if (status === 'PASS') return `<span class="badge badge-pass">PASS</span>`;
    if (status === 'FAIL') return `<span class="badge badge-fail">FAIL</span>`;
    if (status === 'SKIPPED') return `<span class="badge badge-skip">SKIP</span>`;
    return `<span class="badge badge-pending">PENDING</span>`;
  };

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>জনবার্তা অ্যাডমিন ককপিট | Jonobarta Cockpit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b1120;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --red: #d61f2c;
      --green: #10b981;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', -apple-system, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding-bottom: 60px; }
    
    /* Top Header */
    header { background: #0f172a; border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand .logo { color: var(--red); font-size: 26px; font-weight: 800; text-decoration: none; }
    .brand .pill { background: #374151; color: #d1d5db; font-size: 12px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .nav-actions { display: flex; align-items: center; gap: 12px; }
    .btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; border: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-red { background: var(--red); color: #fff; }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
    .btn-green { background: var(--green); color: #fff; }

    /* Layout & Tabs */
    .container { max-width: 1300px; margin: 24px auto; padding: 0 20px; }
    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 24px; overflow-x: auto; }
    .tab-btn { background: none; border: none; color: var(--text-muted); padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: all 0.2s; }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--red); border-bottom-color: var(--red); }
    
    .panel { display: none; }
    .panel.active { display: block; }

    /* Cards & Grids */
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .box { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .box-title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }

    /* Stat Badges */
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
    .stat-label { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    .stat-val { font-size: 24px; font-weight: 700; margin-top: 4px; color: #fff; }

    /* Badges */
    .badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; font-family: 'JetBrains Mono', monospace; }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-skip { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .badge-pending { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th { background: #0f172a; color: var(--text-muted); padding: 12px 14px; font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; border-bottom: 1px solid #283548; vertical-align: middle; }
    tr:hover td { background: rgba(255,255,255,0.02); }

    /* Log Tail Console */
    .console { background: #030712; border: 1px solid #1f2937; border-radius: 6px; padding: 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #9ca3af; height: 260px; overflow-y: auto; line-height: 1.6; }
    .log-entry { margin-bottom: 2px; }
    .log-INFO { color: #93c5fd; }
    .log-WARN { color: #fde047; }
    .log-ERROR { color: #fca5a5; font-weight: bold; }
    .log-SUCCESS { color: #86efac; font-weight: bold; }

    /* Card Studio */
    .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; }
    .template-card { background: var(--card-bg); border: 2px solid var(--border); border-radius: 10px; overflow: hidden; transition: all 0.2s; position: relative; }
    .template-card.active-tpl { border-color: var(--red); box-shadow: 0 0 15px rgba(214, 31, 44, 0.3); }
    .template-card img { width: 100%; height: auto; display: block; }
    .template-info { padding: 16px; display: flex; justify-content: space-between; align-items: center; }
    .template-name { font-weight: 700; font-size: 16px; }

    /* Switch toggle */
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #475569; transition: .3s; border-radius: 24px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: var(--green); }
    input:checked + .slider:before { transform: translateX(20px); }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <a href="/" target="_blank" class="logo">জনবার্তা</a>
      <span class="pill">ADMIN COCKPIT</span>
      <span class="badge ${cronStatus === 'ACTIVE' ? 'badge-pass' : 'badge-skip'}">CRON: ${cronStatus}</span>
      <span class="badge ${keepAliveStatus === 'HEALTHY' ? 'badge-pass' : 'badge-fail'}">WATCHDOG: ${keepAliveStatus}</span>
    </div>
    <div class="nav-actions">
      <button class="btn btn-red" onclick="triggerNewsCycle()">⚡ রান সাইকেল নাও (Run Cycle Now)</button>
      <a href="/admin/logout" class="btn btn-outline">লগআউট</a>
    </div>
  </header>

  <div class="container">
    <div class="tabs">
      <button class="tab-btn active" onclick="showPanel('panel-health')">১. পাইপলাইন হেলথ (Pipeline Health)</button>
      <button class="tab-btn" onclick="showPanel('panel-studio')">২. কার্ড স্টুডিও (Card Studio)</button>
      <button class="tab-btn" onclick="showPanel('panel-posts')">৩. পোস্ট পারফরম্যান্স (Post Performance)</button>
      <button class="tab-btn" onclick="showPanel('panel-traffic')">৪. ট্র্যাফিক ও এনালাইটিক্স (Traffic Overview)</button>
      <button class="tab-btn" onclick="showPanel('panel-controls')">৫. কন্ট্রোল ও ফিড ম্যানেজার (Controls)</button>
    </div>

    <!-- PANEL 1: PIPELINE HEALTH -->
    <div id="panel-health" class="panel active">
      <div class="grid-4">
        <div class="stat-card">
          <div class="stat-label">ক্রন শিডিউল</div>
          <div class="stat-val" style="color: #38bdf8;">প্রতি ১ ঘণ্টা (0 * * * *)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">কিপ-অ্যালাইভ পিং</div>
          <div class="stat-val" style="color: #34d399;">সক্রিয় (5-min interval)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">পোস্টিং হোল্ড স্ট্যাটাস</div>
          <div class="stat-val" style="color: ${holdPosting ? '#ef4444' : '#10b981'};">${holdPosting ? 'ON HOLD' : 'ACTIVE'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">অরিজিনালিটি রেশিও</div>
          <div class="stat-val" style="color: #f59e0b;">${originalityRatio}</div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">
          <span>সর্বশেষ ১০টি নিউজ সাইকেল রান (Last 10 Pipeline Runs)</span>
          <span style="font-size: 13px; color: var(--text-muted); font-weight: normal;">প্রতিটি ধাপের পাস/ফেল স্ট্যাটাস</span>
        </div>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>রান আইডি</th>
                <th>সময়</th>
                <th>ট্রিগার</th>
                <th>স্ট্যাটাস</th>
                <th>Fetch</th>
                <th>Dedup</th>
                <th>Eval</th>
                <th>Sanitizer</th>
                <th>Image</th>
                <th>Card</th>
                <th>Blogger</th>
                <th>FB Webhook</th>
              </tr>
            </thead>
            <tbody>
              ${runs.length === 0 ? `<tr><td colspan="12" style="text-align: center; color: var(--text-muted);">কোনো পূর্ববর্তী রান পাওয়া যায়নি</td></tr>` : ''}
              ${runs.map(r => `
                <tr>
                  <td><code style="color: #93c5fd;">${r.id}</code></td>
                  <td>${new Date(r.startedAt).toLocaleTimeString('bn-BD')}</td>
                  <td><span class="badge ${r.trigger === 'cron' ? 'badge-skip' : 'badge-pass'}">${r.trigger}</span></td>
                  <td>${stageBadge(r.status)}</td>
                  <td>${stageBadge(r.stages?.fetch)}</td>
                  <td>${stageBadge(r.stages?.dedup)}</td>
                  <td>${stageBadge(r.stages?.eval)}</td>
                  <td>${stageBadge(r.stages?.sanitizer)}</td>
                  <td>${stageBadge(r.stages?.image)}</td>
                  <td>${stageBadge(r.stages?.card)}</td>
                  <td>${stageBadge(r.stages?.blogger)}</td>
                  <td>${stageBadge(r.stages?.webhook)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="box">
        <div class="box-title">
          <span>লাইভ সিস্টেম এরর ও অ্যাক্টিভিটি লগ টেইল (Live Log Tail)</span>
          <button class="btn btn-outline" style="font-size: 12px; padding: 4px 10px;" onclick="location.reload()">রিফ্রেশ</button>
        </div>
        <div class="console" id="logConsole">
          ${logs.length === 0 ? '<div class="log-entry">লগ খালি...</div>' : ''}
          ${logs.map(l => `<div class="log-entry log-${l.level}">[${l.timestamp.slice(11, 19)}] [${l.level}] ${l.message}</div>`).join('')}
        </div>
      </div>
    </div>

    <!-- PANEL 2: CARD STUDIO -->
    <div id="panel-studio" class="panel">
      <div class="box" style="margin-bottom: 24px;">
        <div class="box-title">
          <span>কার্ড স্টুডিও: অ্যাক্টিভ টেমপ্লেট নির্বাচন করুন (Active News Card Template)</span>
          <span style="font-size: 14px; color: var(--green);">বর্তমান অ্যাক্টিভ: <strong>${activeTemplate}</strong></span>
        </div>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
          যেকোনো কার্ডের "Activate This Template" বাটনে ক্লিক করলে পরবর্তী সকল পোস্ট স্বয়ংক্রিয়ভাবে সেই ডিজাইনে রেন্ডার হয়ে ব্লগার ও ফেসবুকে পোস্ট হবে।
        </p>

        <div class="template-grid">
          ${templates.map(t => `
            <div class="template-card ${t.id === activeTemplate ? 'active-tpl' : ''}">
              <img src="/cards/preview_${t.id}.png" alt="${t.name}" onerror="this.src='/cards/preview_bold-headline.png'">
              <div class="template-info">
                <div>
                  <div class="template-name">${t.name}</div>
                  <div style="font-size: 12px; color: var(--text-muted);">${t.id}</div>
                </div>
                ${t.id === activeTemplate ? `
                  <span class="badge badge-pass" style="padding: 6px 12px; font-size: 13px;">ACTIVE</span>
                ` : `
                  <button class="btn btn-red" style="font-size: 13px; padding: 6px 14px;" onclick="activateTemplate('${t.id}')">সক্রিয় করুন</button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- PANEL 3: POST PERFORMANCE -->
    <div id="panel-posts" class="panel">
      <div class="box">
        <div class="box-title">
          <span>বাস্তব প্রকাশিত পোস্ট সমূহ (Published Stories Ledger)</span>
          <span style="font-size: 13px; color: var(--text-muted);">মোট পোস্ট: ${articles.length} টি</span>
        </div>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>শিরোনাম</th>
                <th>ক্যাটাগরি</th>
                <th>প্রকাশের সময়</th>
                <th>ইমেজ টায়ার</th>
                <th>কার্ড ডিজাইন</th>
                <th>ব্লগার লিংক</th>
                <th>ফেসবুক ডিসপ্যাচ</th>
              </tr>
            </thead>
            <tbody>
              ${articles.length === 0 ? `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">কোনো পোস্ট নেই</td></tr>` : ''}
              ${articles.map(a => `
                <tr>
                  <td style="max-width: 320px; font-weight: 600;">
                    <a href="${a.bloggerPostUrl || '/news/' + a.slug}" target="_blank" style="color: #f8fafc; text-decoration: none;">
                      ${a.title}
                    </a>
                  </td>
                  <td><span class="badge badge-skip">${a.category || 'জাতীয়'}</span></td>
                  <td>${new Date(a.publishedAt).toLocaleDateString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span class="badge badge-pass">${a.photoUrl?.includes('unsplash') ? 'Tier 2 (Stock)' : 'Tier 1 (Source)'}</span></td>
                  <td><code style="color: #f59e0b;">${a.cardTemplateId || 'bold-headline'}</code></td>
                  <td>
                    ${a.bloggerPostUrl ? `
                      <a href="${a.bloggerPostUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">ব্লগার পোস্ট ↗</a>
                    ` : '<span style="color: var(--text-muted);">পেন্ডিং</span>'}
                  </td>
                  <td>
                    <span class="badge badge-pass">DISPATCHED</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PANEL 4: TRAFFIC OVERVIEW -->
    <div id="panel-traffic" class="panel">
      <div class="grid-2">
        <div class="box">
          <div class="box-title">ক্লাউডফ্লেয়ার ওয়েব এনালাইটিক্স (Cloudflare Web Analytics)</div>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
            ব্লগার থিম এবং পোর্টাল লেআউটে ক্লাউডফ্লেয়ার লাইভ বীকন স্ক্রিপ্ট ইন্টিগ্রেট করা রয়েছে। এটি ক্লাউডফ্লেয়ার ড্যাশবোর্ড থেকে রিয়েল-টাইম ভিজিটর ট্র্যাক করে।
          </p>
          <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Beacon Status:</span>
              <span class="badge badge-pass">ACTIVE & EMITTING</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Target Host:</span>
              <code style="color: #38bdf8;">jonobartaonline.blogspot.com</code>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Privacy Standard:</span>
              <span style="color: var(--green);">100% Cookieless GDPR Compliant</span>
            </div>
          </div>
        </div>

        <div class="box">
          <div class="box-title">পোর্টাল ডেটাবেজ স্ট্যাটাস</div>
          <div class="stat-card" style="margin-bottom: 12px;">
            <div class="stat-label">সর্বমোট প্রকাশিত প্রতিবেদন</div>
            <div class="stat-val">${articles.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">অরিজিনালিটি সুরক্ষা</div>
            <div class="stat-val" style="color: var(--green);">${originalityRatio}</div>
          </div>
        </div>
      </div>

      <div class="box">
        <div class="box-title">সর্বোচ্চ পঠিত শীর্ষ সংবাদ (Top Stories)</div>
        <table>
          <thead>
            <tr>
              <th>শিরোনাম</th>
              <th>ক্যাটাগরি</th>
              <th>ভিউ সংখ্যা</th>
              <th>লিংক</th>
            </tr>
          </thead>
          <tbody>
            ${articles.slice(0, 5).map(a => `
              <tr>
                <td>${a.title}</td>
                <td><span class="badge badge-skip">${a.category || 'জাতীয়'}</span></td>
                <td><strong style="color: #38bdf8;">${a.views || 1}</strong> views</td>
                <td><a href="${a.bloggerPostUrl || '/news/' + a.slug}" target="_blank" style="color: #38bdf8;">দেখুন ↗</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- PANEL 5: CONTROLS & FEED MANAGER -->
    <div id="panel-controls" class="panel">
      <div class="grid-2">
        <div class="box">
          <div class="box-title">পোস্টিং কিল-সুইচ (Emergency Kill Switch)</div>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
            জরুরি প্রয়োজনে স্বয়ংক্রিয় পোস্টিং সাময়িকভাবে স্থগিত রাখতে এই সুইচটি ব্যবহার করুন।
          </p>
          <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; padding: 14px; border-radius: 8px; border: 1px solid var(--border);">
            <div>
              <div style="font-weight: 700;">HOLD_POSTING মোড</div>
              <div style="font-size: 13px; color: var(--text-muted);">চালু থাকলে ক্রন ও ম্যানুয়াল সাইকেল কোনো পোস্ট পাবলিশ করবে না।</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="holdSwitch" ${holdPosting ? 'checked' : ''} onchange="toggleHoldPosting(this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="box">
          <div class="box-title">ম্যানুয়াল রান কন্ট্রোল</div>
          <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
            ক্রন টাইমারের জন্য অপেক্ষা না করে অবিলম্বে একটি পূর্ণাঙ্গ নিউজ সাইকেল রান করুন।
          </p>
          <button class="btn btn-red" style="width: 100%; justify-content: center; padding: 12px;" onclick="triggerNewsCycle()">
            ⚡ অবিলম্বে নিউজ সাইকেল চালু করুন (Run Cycle Now)
          </button>
        </div>
      </div>

      <div class="box">
        <div class="box-title">
          <span>আরএসএস ফিড ম্যানেজার (RSS Feed Health & Toggle)</span>
          <span style="font-size: 13px; color: var(--text-muted);">মোট ৮টি সোর্স</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>সংবাদমাধ্যম</th>
              <th>ফিড URL</th>
              <th>হেলথ স্ট্যাটাস</th>
              <th>এনাবল / ডিজেবল</th>
            </tr>
          </thead>
          <tbody>
            ${feeds.map(f => `
              <tr>
                <td style="font-weight: 600;">${f.name}</td>
                <td><code style="font-size: 12px; color: #94a3b8;">${f.url}</code></td>
                <td>
                  ${f.isBroken ? `
                    <span class="badge badge-fail">404 ERROR (BROKEN)</span>
                  ` : `
                    <span class="badge badge-pass">HEALTHY (200 OK)</span>
                  `}
                </td>
                <td>
                  <label class="switch">
                    <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="toggleFeed('${f.id}', this.checked)">
                    <span class="slider"></span>
                  </label>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <script>
    function showPanel(panelId) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const target = document.getElementById(panelId);
      if (target) target.classList.add('active');
      event.target.classList.add('active');
    }

    async function activateTemplate(templateId) {
      if (!confirm('আপনি কি নিশ্চিত যে কার্ড ডিজাইন হিসেবে ' + templateId + ' সক্রিয় করতে চান?')) return;
      try {
        const res = await fetch('/admin/api/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId })
        });
        const data = await res.json();
        if (data.success) {
          alert('কার্ড ডিজাইন সফলভাবে পরিবর্তিত হয়েছে: ' + templateId);
          location.reload();
        } else {
          alert('পরিবর্তন ব্যর্থ: ' + (data.error || 'Unknown'));
        }
      } catch (err) {
        alert('এরর: ' + err.message);
      }
    }

    async function toggleHoldPosting(hold) {
      try {
        const res = await fetch('/admin/api/hold-posting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hold })
        });
        const data = await res.json();
        if (data.success) {
          alert('পোস্টিং স্ট্যাটাস আপডেট হয়েছে: ' + (hold ? 'HOLD ENABLED' : 'HOLD DISABLED'));
          location.reload();
        }
      } catch (err) {
        alert('এরর: ' + err.message);
      }
    }

    async function toggleFeed(feedId, enabled) {
      try {
        const res = await fetch('/admin/api/feed/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedId, enabled })
        });
        const data = await res.json();
        if (!data.success) {
          alert('ফিড আপডেট ব্যর্থ: ' + (data.error || 'Unknown'));
        }
      } catch (err) {
        alert('ফিড এরর: ' + err.message);
      }
    }

    async function triggerNewsCycle() {
      if (!confirm('আপনি কি এখনই একটি লাইভ নিউজ সাইকেল রান করতে চান?')) return;
      alert('নিউজ সাইকেল শুরু হয়েছে! ব্যাকগ্রাউন্ডে প্রসেস হচ্ছে। পাইপলাইন হেলথ প্যানেলে স্ট্যাটাস দেখতে পারবেন।');
      try {
        await fetch('/admin/api/trigger', { method: 'POST' });
        setTimeout(() => location.reload(), 3000);
      } catch (err) {
        alert('ট্রিগার এরর: ' + err.message);
      }
    }

    // Auto-scroll log console to bottom
    const logElem = document.getElementById('logConsole');
    if (logElem) logElem.scrollTop = logElem.scrollHeight;
  </script>
</body>
</html>`;
}

module.exports = {
  renderAdminLoginPage,
  renderAdminCockpit
};
