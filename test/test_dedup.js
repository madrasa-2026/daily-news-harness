const assert = require('assert');
const { calculateSimilarity, checkDuplicateStory, normalizeHeadline } = require('../utils/dedup');

console.log('Running Semantic Dedup Tests...');

// 1. Same story with slightly different phrasing (e.g. Bangladesh Bank case)
const title1 = 'বাংলাদেশ ব্যাংকের রিজার্ভ চুরি: তদন্ত প্রতিবেদন দাখিলের তারিখ পিছিয়ে ১৮ মে';
const title2 = 'বাংলাদেশ ব্যাংকের রিজার্ভ চুরির মামলার তদন্ত প্রতিবেদন পেছাল';
const sim1 = calculateSimilarity(title1, title2);
console.log(`Similarity between "${title1}" and "${title2}": ${sim1.toFixed(3)}`);
assert(sim1 >= 0.70, `Expected similarity >= 0.70, got ${sim1}`);

// 2. Near identical stories across outlets (> 0.80)
const titleA = 'বাংলাদেশ ব্যাংকের গভর্নর আহসান এইচ মনসুরের জরুরি সংবাদ সম্মেলন';
const titleB = 'বাংলাদেশ ব্যাংকের গভর্নর আহসান মনসুরের জরুরি সংবাদ সম্মেলন';
const sim2 = calculateSimilarity(titleA, titleB);
console.log(`Similarity between "${titleA}" and "${titleB}": ${sim2.toFixed(3)}`);
assert(sim2 >= 0.80, `Expected similarity >= 0.80, got ${sim2}`);

// 3. Completely different stories (< 0.30)
const titleC = 'পদ্মা সেতুতে যান চলাচলে নতুন রেকর্ড';
const titleD = 'যুক্তরাষ্ট্রে প্রেসিডেন্টের নতুন অর্থনৈতিক প্যাকেজ ঘোষণা';
const sim3 = calculateSimilarity(titleC, titleD);
console.log(`Similarity between "${titleC}" and "${titleD}": ${sim3.toFixed(3)}`);
assert(sim3 < 0.30, `Expected similarity < 0.30, got ${sim3}`);

// 4. Duplicate check against 48h database with >0.8 threshold
const database48h = [
  {
    title: 'বাংলাদেশ ব্যাংকের গভর্নর আহসান এইচ মনসুরের জরুরি সংবাদ সম্মেলন',
    link: 'https://prothomalo.com/business/123',
    processedAt: Date.now() - 38 * 60 * 1000 // 38 mins ago
  }
];

const candidateDuplicate = {
  title: 'বাংলাদেশ ব্যাংকের গভর্নর আহসান এইচ মনসুরের জরুরি সংবাদ সম্মেলন',
  link: 'https://dailyamardesh.com/news/different-url-456' // different URL!
};

const resultDup = checkDuplicateStory(candidateDuplicate, database48h, 0.8);
console.log('Duplicate check result:', resultDup);
assert(resultDup.isDuplicate === true, 'Should detect duplicate despite different URLs');

const candidateDifferent = {
  title: 'আন্তর্জাতিক বাজারে স্বর্ণের দাম কমল',
  link: 'https://dailyamardesh.com/gold-price'
};
const resultDiff = checkDuplicateStory(candidateDifferent, database48h, 0.8);
assert(resultDiff.isDuplicate === false, 'Should allow distinct story');

console.log('All Semantic Dedup tests PASSED!');
