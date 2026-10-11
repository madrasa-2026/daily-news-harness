const axios = require('axios');
const Parser = require('rss-parser');
const parser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });

async function getJamunaYoutubeRss() {
  try {
    const res = await axios.get('https://www.youtube.com/@JamunaTVbd', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const match = res.data.match(/channel_id=([a-zA-Z0-9_-]+)/) || res.data.match(/browse_id=([a-zA-Z0-9_-]+)/) || res.data.match(/"channelId":"([a-zA-Z0-9_-]+)"/);
    if (match) {
      const channelId = match[1];
      console.log('Jamuna TV channelId:', channelId);
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const feed = await parser.parseURL(rssUrl);
      console.log('200 OK! Jamuna TV RSS Title:', feed.title);
      console.log('Jamuna TV RSS items:', feed.items.length);
      console.log('Latest Jamuna headline:', feed.items[0].title);
      console.log('Jamuna RSS URL:', rssUrl);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
getJamunaYoutubeRss();
