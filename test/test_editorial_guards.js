const assert = require('assert');
const {
  sanitizeUnicodeAndMojibake,
  resolveBengaliAttribution,
  scanAndCleanLatinWords,
  buildCleanFacebookCaption,
  validateStoryEditorial
} = require('../utils/editorialGuards');

console.log('Running Editorial Guards Unit Tests...');

// 1. Unicode Sanitizer: Reject U+FFFD
const dirtyText = 'বাংলাদেশ ব্যাংকের নতুন গ\uFFFDার্নর দায়িত্ব নিয়েছেন'; // has U+FFFD
const sanitResult = sanitizeUnicodeAndMojibake(dirtyText, 'headline');
console.log('U+FFFD check:', sanitResult);
assert(sanitResult.ok === false, 'Should reject text with U+FFFD');
assert(sanitResult.rejectedReason.includes('U+FFFD'), 'Reason should mention U+FFFD');

// 2. Unicode Sanitizer: Clean Bengali passes
const cleanText = 'বাংলাদেশ ব্যাংকের নতুন গভর্নর দায়িত্ব গ্রহণ করেছেন';
const cleanResult = sanitizeUnicodeAndMojibake(cleanText, 'headline');
assert(cleanResult.ok === true, 'Should pass clean Bengali text');
assert(cleanResult.cleanText === cleanText.normalize('NFC'));

// 3. Language Consistency: English source to Bengali attribution
assert.strictEqual(resolveBengaliAttribution('Amar Desh'), 'আমার দেশ');
assert.strictEqual(resolveBengaliAttribution('The Daily Star'), 'দ্য ডেইলি স্টার');
assert.strictEqual(resolveBengaliAttribution('BBC News Bangla'), 'বিবিসি বাংলা');
assert.strictEqual(resolveBengaliAttribution('Prothom Alo'), 'প্রথম আলো');
assert.strictEqual(resolveBengaliAttribution('Channel i Online'), 'চ্যানেল আই');
console.log('Source attribution mapping PASSED!');

// 4. Latin script scanning in body text
const bodyWithLatin = 'ব্যাংক কর্তৃপক্ষ depositors দের অর্থ সুরক্ষার আশ্বাস দিয়েছে।';
const cleanedBody = scanAndCleanLatinWords(bodyWithLatin);
console.log('Body with Latin:', bodyWithLatin, '-> Cleaned:', cleanedBody);
assert(!cleanedBody.includes('depositors'), 'Should translate or clean stray Latin word "depositors"');

// 5. Facebook Caption: Zero Links and NO 'তথ্যসূত্র'
const mockArticle = {
  title: 'ব্যাংক খাতে সুশাসন প্রতিষ্ঠায় বিশেষ টাস্কফোর্স গঠন',
  summary: 'খেলাপি ঋণ উদ্ধার ও আর্থিক স্থিতিশীলতা বজায় রাখতে কেন্দ্রীয় ব্যাংক একটি উচ্চপর্যায়ের টাস্কফোর্স গঠন করেছে। এতে আর্থিক খাতের স্বচ্ছতা নিশ্চিত হবে।',
  category: 'অর্থনীতি',
  tags: ['ব্যাংক', 'অর্থনীতি', 'জনবার্তা'],
  sourceFeed: 'আমার দেশ'
};

const fbCaption = buildCleanFacebookCaption(mockArticle);
console.log('--- GENERATED FACEBOOK CAPTION ---');
console.log(fbCaption);
console.log('-----------------------------------');

assert(!fbCaption.includes('http://') && !fbCaption.includes('https://'), 'Must have ZERO URLs');
assert(!fbCaption.includes('তথ্যসূত্র'), 'Must NOT include "তথ্যসূত্র"');
assert(!fbCaption.includes('সূত্র:'), 'Must NOT include "সূত্র:"');
assert(fbCaption.includes('📰 বিস্তারিত খবর কমেন্ট বক্সে 👇'), 'Must include comment pointer');
assert(fbCaption.includes('#জনবার্তা'), 'Must include #জনবার্তা');

console.log('All Editorial Guards tests PASSED!');
