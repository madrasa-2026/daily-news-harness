const axios = require('axios');

async function testChannelOne() {
  try {
    const r1 = await axios.get('https://channelone.news/feed', { timeout: 7000 });
    console.log('channelone.news/feed status:', r1.status);
  } catch (e) {
    console.log('channelone.news/feed err:', e.message);
  }

  try {
    const r2 = await axios.get('https://www.youtube.com/@Channelonenewsbd', {
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const match = r2.data.match(/"channelId":"(UC[^"]+)"/);
    if (match) {
      const channelId = match[1];
      console.log('ChannelOne YouTube channelId:', channelId);
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const r3 = await axios.get(rssUrl, { timeout: 7000 });
      console.log('ChannelOne YouTube RSS status:', r3.status);
      const items = (r3.data.match(/<entry>/g) || []).length;
      console.log('ChannelOne YouTube RSS items:', items);
      console.log('ChannelOne RSS URL:', rssUrl);
    } else {
      console.log('ChannelOne channelId not found in HTML');
    }
  } catch (e) {
    console.log('ChannelOne YouTube err:', e.message);
  }
}

testChannelOne();
