const path = require('path');
const fs = require('fs');
const { generateNewsCard, CARDS_DIR } = require('../utils/cardGenerator');

async function run() {
  console.log('=== GENERATING 3 VALIDATION CARDS ===');

  const stories = [
    {
      id: 'story_1_recent',
      title: 'নির্বাচন কমিশনকে মেরুদণ্ড সোজা করে দায়িত্ব পালন করতে হবে: জামায়াত নেতা জুবায়ের',
      snippet: 'অন্তর্বর্তী সরকারের সংস্কার কার্যক্রমকে বেগবান করার আহ্বান জানিয়ে নির্বাচন কমিশনের জবাবদিহিতা ও স্বচ্ছতা নিশ্চিত করার জোর তাগিদ।',
      source: 'দৈনিক আমার দেশ',
      category: 'রাজনীতি',
      link: 'https://example.com/story-1-recent'
    },
    {
      id: 'story_2_long_headline',
      title: 'চট্টগ্রামে জ্ঞাত আয়বহির্ভূত সম্পদ অর্জনের দুর্নীতি দমন কমিশনের মামলায় সাবেক ট্রাফিক পুলিশ সার্জেন্টকে তিন বছরের সশ্রম কারাদণ্ড ও বিশাল জরিমানা প্রদান করেছেন আদালত',
      snippet: 'বিশেষ জজ আদালতের বিচারক রায় ঘোষণার পর আসামিকে কারাগারে প্রেরণের নির্দেশ দেন; আত্মসাৎকৃত অর্থ রাষ্ট্রীয় কোষাগারে জমা দেওয়ার নির্দেশ।',
      source: 'প্রথম আলো',
      category: 'আইন ও আদালত',
      link: 'https://example.com/story-2-long-headline'
    },
    {
      id: 'story_3_conjunct_heavy',
      title: 'যুক্তরাষ্ট্রে বিজ্ঞানীদের সূক্ষ্ম গবেষণায় দৃষ্টান্তে উত্তীর্ণ প্রযুক্তি: বিশেষজ্ঞদের তীব্র প্রতিক্রিয়া ও ক্ষুব্ধ বার্তা',
      snippet: 'ব্রাহ্মণবাড়িয়ায় শিক্ষার্থীদের বিক্ষোভ সমাবেশ; সংবিধানে মৌলিক অধিকার সংরক্ষণ, সুপ্রিম কোর্টের স্বাধীনতা ও রাষ্ট্রের কাঠামোগত সংস্কারে ঐক্যবদ্ধ অবস্থানের অঙ্গীকার।',
      source: 'বিবিসি বাংলা',
      category: 'বিজ্ঞান ও প্রযুক্তি',
      link: 'https://example.com/story-3-conjunct-heavy'
    }
  ];

  const results = [];
  for (let i = 0; i < stories.length; i++) {
    const s = stories[i];
    console.log(`\nGenerating card [${i + 1}/3]: "${s.title.slice(0, 50)}..."`);
    const card = await generateNewsCard({
      title: s.title,
      snippet: s.snippet,
      source: s.source,
      link: s.link
    });
    if (card) {
      console.log(`✓ Card [${i + 1}] generated at: ${card.fullPath}`);
      results.push(card);
    } else {
      console.error(`✗ Card [${i + 1}] failed!`);
    }
  }

  console.log('\n=== ALL 3 CARDS GENERATED SUCCESSFULLY ===');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
