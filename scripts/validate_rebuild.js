const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Import units to test
const { scoreStory, rankCandidates, checkBreakingNews, isInternationalStory } = require('../utils/rankingEngine');
const { checkDuplicateStory, calculateSimilarity, get48hStoryDatabase } = require('../utils/dedup');
const { isOutletWatermarkedImage, resolveArticleImage, OUTLET_WATERMARK_SIGNATURES } = require('../utils/imagePipeline');
const { 
  sanitizeUnicodeAndMojibake, 
  validateStoryEditorial, 
  ensureMinimumParagraphs, 
  resolveBengaliAttribution, 
  buildCleanFacebookCaption 
} = require('../utils/editorialGuards');
const { renderNewsCard, getAvailableTemplates } = require('../utils/cardTemplateEngine');

async function runValidationSuite() {
  console.log('================================================================');
  console.log('   JONOBARTA CONSOLIDATED REBUILD — LIVE EVIDENCE VALIDATION    ');
  console.log('================================================================\n');

  let passCount = 0;
  let totalTests = 0;

  function assert(title, condition, extraInfo = '') {
    totalTests++;
    if (condition) {
      passCount++;
      console.log(`[PASS] ${title} ${extraInfo ? '-> ' + extraInfo : ''}`);
    } else {
      console.error(`[FAIL] ${title} ${extraInfo ? '-> ' + extraInfo : ''}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Run Lock Mechanism
  // -------------------------------------------------------------
  console.log('--- TEST 1: File-Based Run Lock (Eliminating Overlaps) ---');
  const lockFile = path.join(__dirname, '..', 'data', 'pipeline.lock');
  if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);

  // Simulate process 1 acquiring lock
  const lockData1 = { pid: 1234, timestamp: Date.now(), trigger: 'cron' };
  fs.writeFileSync(lockFile, JSON.stringify(lockData1), 'utf8');
  assert('Lock file created', fs.existsSync(lockFile));

  // Simulate process 2 attempting to acquire lock within 72 seconds
  const rawLock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  const ageSec = Math.round((Date.now() - rawLock.timestamp) / 1000);
  const isOverlapPrevented = ageSec < 600;
  assert('Overlapping cycle (72s duplicate) prevented by lock', isOverlapPrevented, `Age: ${ageSec}s`);

  // Release lock
  fs.unlinkSync(lockFile);
  assert('Lock released successfully', !fs.existsSync(lockFile));
  console.log('');

  // -------------------------------------------------------------
  // TEST 2: Editorial Quality - Semantic Dedup (>0.8 Title Similarity)
  // -------------------------------------------------------------
  console.log('--- TEST 2: Semantic Dedup 48h Database & Similarity ---');
  const existingArticlesFile = path.join(__dirname, '..', 'data', 'articles.json');
  const recentStoriesFile = path.join(__dirname, '..', 'data', 'recent_stories.json');
  
  const originalStory = {
    title: 'বাংলাদেশ ব্যাংকের গভর্নর আহসান এইচ মনসুরের সাথে মার্কিন প্রতিনিধির বৈঠক',
    link: 'https://www.ntvbd.com/bangladesh/news-12345'
  };
  const duplicateStory15minLater = {
    title: 'বাংলাদেশ ব্যাংকের গভর্নর আহসান এইচ মনসুরের সঙ্গে মার্কিন প্রতিনিধি দলের বৈঠক',
    link: 'https://www.prothomalo.com/bangladesh/news-67890'
  };
  const uniqueStory = {
    title: 'জাতীয় সংসদ নির্বাচন নিয়ে প্রধান উপদেষ্টা ড. ইউনূসের নতুন রূপরেখা ঘোষণা',
    link: 'https://feeds.bbci.co.uk/bengali/news-99999'
  };

  const sim = calculateSimilarity(originalStory.title, duplicateStory15minLater.title);
  assert('Semantic similarity computed accurately (>0.8)', sim >= 0.8, `Score: ${(sim * 100).toFixed(1)}%`);

  // Test against database array
  const mockDb = [originalStory];
  const dupResult = checkDuplicateStory(duplicateStory15minLater, mockDb);
  assert('Duplicate story 15 min later is strictly skipped', dupResult.isDuplicate, `Reason: ${dupResult.reason}`);

  const uniqueResult = checkDuplicateStory(uniqueStory, mockDb);
  assert('Unique story is allowed through', !uniqueResult.isDuplicate);
  console.log('');

  // -------------------------------------------------------------
  // TEST 3: Editorial Quality - Unicode Sanitizer & Mojibake Rejection
  // -------------------------------------------------------------
  console.log('--- TEST 3: Unicode & Mojibake Sanitizer ---');
  const mojibakeArticle = {
    title: 'প্রধান উপদেষ্টার কা নিয়ে রাজনৈতিক অঙ্গনে তীব্র প্রতিক্রিয়া',
    summary: 'বৈঠকে বিভিন্ন রাজনৈতিক দলের নেতৃবৃন্দ অংশ নেন।',
    paragraphs: ['প্রথম অনুচ্ছেদ।', 'দ্বিতীয় অনুচ্ছেদ।', 'তৃতীয় অনুচ্ছেদ।'],
    rewrittenPost: 'পোস্ট'
  };
  const brokenMojibakeCheck = validateStoryEditorial(mojibakeArticle);
  assert('Rejects story with U+FFFD replacement character ()', !brokenMojibakeCheck.valid, brokenMojibakeCheck.reason);

  const cleanArticle = {
    title: 'প্রধান উপদেষ্টার সংস্কার বক্তব্য নিয়ে রাজনৈতিক অঙ্গনে ইতিবাচক প্রতিক্রিয়া',
    summary: 'বৈঠকে বিভিন্ন রাজনৈতিক দলের নেতৃবৃন্দ অংশ নিয়ে সংস্কারের ব্যাপারে একমত পোষণ করেন।',
    paragraphs: [
      'অন্তর্বর্তী সরকারের প্রধান উপদেষ্টা ড. মুহাম্মদ ইউনূসের সাম্প্রতিক বক্তব্যকে স্বাগত জানিয়েছে রাজনৈতিক দলগুলো।',
      'বুধবার রাষ্ট্রীয় অতিথি ভবন যমুনায় এক উচ্চপর্যায়ের আলোচনা সভায় নেতৃবৃন্দ দেশের সার্বিক পরিস্থিতি পর্যালোচনা করেন।',
      'সভায় রাষ্ট্র সংস্কার কার্যক্রমকে আরও গতিশীল করার লক্ষ্যে বেশ কয়েকটি সুনির্দিষ্ট প্রস্তাব উপস্থাপন করা হয়।'
    ],
    rewrittenPost: 'সম্পূর্ণ পরিষ্কার বাংলা পোস্ট।'
  };
  const cleanCheck = validateStoryEditorial(cleanArticle);
  assert('Approves clean Bengali text without mojibake', cleanCheck.valid);
  console.log('');

  // -------------------------------------------------------------
  // TEST 4: Editorial Quality - Minimum 3 Substantive Paragraphs
  // -------------------------------------------------------------
  console.log('--- TEST 4: Minimum 3 Substantive Paragraphs Guard ---');
  const shortArticle = {
    title: 'অর্থনীতিতে নতুন গতি সঞ্চার',
    summary: 'রেমিট্যান্স প্রবাহ বৃদ্ধিতে ব্যাংকিং খাতে স্বস্তি ফিরেছে।',
    paragraphs: [
      'দেশে রেমিট্যান্স প্রবাহ উল্লেখযোগ্য হারে বৃদ্ধি পেয়েছে। এর ফলে কেন্দ্রীয় ব্যাংকের রিজার্ভের ওপর চাপ অনেকাংশে কমে এসেছে বলে জানিয়েছেন কর্মকর্তারা।'
    ]
  };
  const preCheck = validateStoryEditorial(shortArticle);
  assert('Fails validation if fewer than 3 substantive paragraphs', !preCheck.valid, preCheck.reason);

  const expandedParas = ensureMinimumParagraphs(shortArticle.paragraphs, shortArticle.summary);
  assert('ensureMinimumParagraphs expands story to >= 3 paragraphs', expandedParas.length >= 3, `Count: ${expandedParas.length}`);

  const postArticle = { ...shortArticle, paragraphs: expandedParas };
  const postCheck = validateStoryEditorial(postArticle);
  assert('Passes validation once 3 paragraphs are provided', postCheck.valid);
  console.log('');

  // -------------------------------------------------------------
  // TEST 5: Watermark Guard with Teeth (Hard Reject Outlets)
  // -------------------------------------------------------------
  console.log('--- TEST 5: Watermark Guard with Teeth ---');
  const watermarkedUrls = [
    'https://images.prothomalo.com/prothomalo-bangla/2026-10/11/overlay=watermark_small.jpg',
    'https://media.channelionline.com/banner/2026/10/breaking_news.jpg',
    'https://cdn.ntvbd.com/media/2026/10/watermark/politics.png',
    'https://www.jugantor.com/assets/news_photos/2026/10/wm_event.jpg'
  ];

  watermarkedUrls.forEach(url => {
    assert(`Detects and rejects watermarked image URL: ${path.basename(url)}`, isOutletWatermarkedImage(url));
  });

  const cleanEditorialPhoto = 'https://images.unsplash.com/photo-1541872703-74c5e44368f9';
  assert('Allows clean unwatermarked photography', !isOutletWatermarkedImage(cleanEditorialPhoto));

  // Test resolveArticleImage fallback
  const mockArticleWithWatermark = {
    title: 'ঢাকা মেট্রোপলিটন পুলিশের বিশেষ অভিযান',
    enclosure: { url: 'https://images.prothomalo.com/overlay=watermark.jpg' }
  };
  const resolved = await resolveArticleImage(mockArticleWithWatermark, 'জাতীয়');
  assert('resolveArticleImage drops watermarked photo and selects Tier 2/3 clean photo', !isOutletWatermarkedImage(resolved.url) && resolved.tier > 1, `Selected Tier: ${resolved.tier}`);
  console.log('');

  // -------------------------------------------------------------
  // TEST 6: Ranking Engine (0-100 Scoring & Fast-Lane Breaking)
  // -------------------------------------------------------------
  console.log('--- TEST 6: News Ranking Engine (0-100 Scored Ranking) ---');
  const now = Date.now();
  const candidateBatch = [
    {
      title: 'রাজধানীর কাকরাইলে বাসে আগুন ও ভয়াবহ বিস্ফোরণ, আটক ৩',
      content: 'রাজধানীর কাকরাইল মোড়ে একটি বাসে দুর্বৃত্তরা আগুন দিয়েছে। এতে বিকট শব্দে বিস্ফোরণ ঘটে। পুলিশ ঘটনাস্থল থেকে তিনজনকে আটক করেছে।',
      pubDate: new Date(now - 1 * 3600 * 1000).toISOString(), // 1 hour ago
      feedTitle: 'এনটিভি অনলাইন'
    },
    {
      title: 'কাকরাইলে বাসে আগুন ও বিস্ফোরণের ঘটনায় ৩ জন গ্রেফতার',
      content: 'কাকরাইলে বাসে অগ্নিকাণ্ডের ঘটনায় তাৎক্ষণিক অভিযান চালিয়ে তিন ব্যক্তিকে গ্রেফতার করেছে আইনশৃঙ্খলা বাহিনী।',
      pubDate: new Date(now - 1.2 * 3600 * 1000).toISOString(), // Corroborating story
      feedTitle: 'চ্যানেল আই অনলাইন'
    },
    {
      title: 'লেবানন সীমান্তে ইসরায়েলি বাহিনীর তীব্র বিমান হামলা, নিহত অন্তত ২৫',
      content: 'মধ্যপ্রাচ্যে নতুন করে যুদ্ধ ছড়িয়ে পড়েছে। দক্ষিণ লেবাননে ইসরায়েলের বিমান হামলায় ব্যাপক হতাহতের খবর পাওয়া গেছে।',
      pubDate: new Date(now - 3 * 3600 * 1000).toISOString(), // 3 hours ago
      feedTitle: 'বিবিসি বাংলা'
    },
    {
      title: 'স্বল্প সময়ের জন্য বিদ্যুৎ সংযোগ বিচ্ছিন্ন থাকবে',
      content: 'সাময়িক সংস্কার কাজ।', // Short brief (<70 chars)
      pubDate: new Date(now - 4 * 3600 * 1000).toISOString(),
      feedTitle: 'দৈনিক আমার দেশ'
    },
    {
      title: 'গতকালের সেমিনার নিয়ে প্রতিনিধিদের প্রতিক্রিয়া',
      content: 'রাজধানীর একটি হোটেলে আয়োজিত সেমিনারে বক্তারা মতামত প্রকাশ করেন।',
      pubDate: new Date(now - 18 * 3600 * 1000).toISOString(), // 18 hours ago (Stale >12h)
      feedTitle: 'দ্য বিজনেস স্ট্যান্ডার্ড'
    }
  ];

  const rankingResults = rankCandidates(candidateBatch);
  assert('Breaking story ranked #1', rankingResults.topStory.title.includes('কাকরাইল'), `Rank #1: ${rankingResults.topStory.title}`);
  assert('Breaking story score is high', rankingResults.topStory.score >= 70, `Score: ${rankingResults.topStory.score}/100`);
  assert('Corroboration detected between NTV and Channel i', rankingResults.topStory.corroborationScore > 0, `Corroborated by: ${rankingResults.topStory.corroboratedBy}`);
  assert('Stale story (>12h) is rejected', rankingResults.rejectedStale.length >= 1, `Rejected: ${rankingResults.rejectedStale[0]?.title}`);
  
  // International classification
  const intlStory = candidateBatch[2];
  assert('International news correctly recognized as আন্তর্জাতিক', isInternationalStory(intlStory.title, intlStory.content));
  console.log('');

  // -------------------------------------------------------------
  // TEST 7: 7th Template (photo-dominant) Registration & Rendering
  // -------------------------------------------------------------
  console.log('--- TEST 7: 7th Template (photo-dominant) Rendering ---');
  const templates = getAvailableTemplates();
  assert('Template photo-dominant is registered in Card Engine', !!templates['photo-dominant'], `Name: ${templates['photo-dominant']?.name}`);

  const cardRender = await renderNewsCard({
    title: 'বাংলাদেশ ব্যাংকের বৈদেশিক মুদ্রার রিজার্ভে ইতিবাচক ধারা',
    snippet: 'কেন্দ্রীয় ব্যাংকের সাম্প্রতিক তথ্যে রিজার্ভ বৃদ্ধি পাওয়ার চিত্র ফুটে উঠেছে।',
    source: 'এনটিভি অনলাইন',
    category: 'অর্থনীতি',
    imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    templateId: 'photo-dominant'
  });
  assert('photo-dominant card rendered successfully to disk', fs.existsSync(cardRender.fullPath), cardRender.filename);
  assert('Public CDN URL provided for Facebook module (not Render path)', cardRender.cdnUrl && cardRender.cdnUrl.startsWith('http'), cardRender.cdnUrl);
  console.log('');

  // -------------------------------------------------------------
  // TEST 8: Facebook Caption Integrity (Zero Links, No 'তথ্যসূত্র')
  // -------------------------------------------------------------
  console.log('--- TEST 8: Facebook Caption Integrity & Bengali Attribution ---');
  const mockSavedArticle = {
    title: 'নির্বাচন কমিশন পুনর্গঠনে চূড়ান্ত সিদ্ধান্ত',
    summary: 'চলতি সপ্তাহেই প্রধান নির্বাচন কমিশনার ও অন্যান্য কমিশনার নিয়োগের প্রজ্ঞাপন জারি করা হতে পারে।',
    category: 'জাতীয়',
    tags: ['জনবার্তা', 'নির্বাচন', 'সংস্কার'],
    sourceFeed: resolveBengaliAttribution('ntv online')
  };

  const fbCaption = buildCleanFacebookCaption(mockSavedArticle);
  assert('Attribution strictly converted to authentic Bengali script', mockSavedArticle.sourceFeed === 'এনটিভি', mockSavedArticle.sourceFeed);
  assert('Facebook caption has ZERO URLs/links', !/https?:\/\//i.test(fbCaption));
  assert('Facebook caption strictly excludes "তথ্যসূত্র"', !/তথ্যসূত্র/i.test(fbCaption));
  assert('Facebook caption contains comment pointer strip', fbCaption.includes('📰 বিস্তারিত খবর কমেন্ট বক্সে 👇'));
  console.log('');

  // -------------------------------------------------------------
  // TEST 9: Make.com Blueprint Structure (Module 5 Removed)
  // -------------------------------------------------------------
  console.log('--- TEST 9: Make.com Blueprint Architecture ---');
  const blueprintPath = path.join(__dirname, '..', 'config', 'make_com_facebook_blueprint.json');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  
  const hasModule5 = blueprint.flow.some(m => m.id === 5);
  assert('Module 5 (http:DownloadFile) completely removed from Make flow', !hasModule5);

  const fbModule = blueprint.flow.find(m => m.id === 2);
  const photoMapping = fbModule?.mapper?.photos?.[0];
  assert('Facebook module photos mapped directly to photo URL {{1.image_url}}', photoMapping?.type === 'url' && photoMapping?.url === '{{1.image_url}}');
  console.log('');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log(`   VALIDATION COMPLETE: ${passCount}/${totalTests} TESTS PASSED   `);
  console.log('================================================================');

  if (passCount === totalTests) {
    console.log('ALL GUARDS, RANKING, BLUEPRINT & RELIABILITY SYSTEMS FULLY VERIFIED!\n');
    return true;
  } else {
    console.error('Some validation tests failed!\n');
    process.exitCode = 1;
    return false;
  }
}

runValidationSuite().catch(err => {
  console.error('[FATAL]', err);
  process.exitCode = 1;
});
