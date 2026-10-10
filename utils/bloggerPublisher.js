const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

const getBloggerBlogId = () => process.env.BLOGGER_BLOG_ID || '';
const getBloggerClientId = () => process.env.BLOGGER_CLIENT_ID || '';
const getBloggerClientSecret = () => process.env.BLOGGER_CLIENT_SECRET || '';
const getBloggerRefreshToken = () => process.env.BLOGGER_REFRESH_TOKEN || '';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain a fresh OAuth 2.0 Access Token using the refresh token
 */
async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const clientId = getBloggerClientId();
  const clientSecret = getBloggerClientSecret();
  const refreshToken = getBloggerRefreshToken();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Blogger OAuth2 credentials (BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN)');
  }

  try {
    const res = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    cachedAccessToken = res.data.access_token;
    // Set expiration 5 minutes before actual expiry
    tokenExpiresAt = Date.now() + ((res.data.expires_in || 3600) - 300) * 1000;
    console.log('[BLOGGER] Successfully refreshed Google OAuth2 access token.');
    return cachedAccessToken;
  } catch (err) {
    const msg = err.response?.data?.error_description || err.response?.data?.error || err.message;
    console.error('[BLOGGER] Token refresh failed:', msg);
    throw new Error(`Blogger token refresh failed: ${msg}`);
  }
}

/**
 * Format article into clean, AdSense-ready Blogger HTML
 */
function buildBloggerHtml({ summary, paragraphs, imageUrl, sourceFeed, isOriginal }) {
  let html = `<div style="font-family: 'SolaimanLipi', 'Hind Siliguri', Arial, sans-serif; font-size: 18px; line-height: 1.8; color: #1e293b;">`;

  // 1. Feature image at top
  if (imageUrl) {
    html += `
    <div style="text-align: center; margin-bottom: 24px;">
      <img src="${imageUrl}" alt="Jonobarta News" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
    </div>`;
  }

  // 2. Lead summary callout
  if (summary) {
    html += `
    <div style="background-color: #f8fafc; border-left: 4px solid #d61f2c; padding: 14px 18px; margin-bottom: 20px; font-weight: 600; color: #334155; border-radius: 0 8px 8px 0;">
      ${summary}
    </div>`;
  }

  // 3. Body paragraphs
  const paras = Array.isArray(paragraphs) ? paragraphs : [paragraphs || summary];
  paras.forEach(p => {
    if (p && p.trim()) {
      html += `<p style="margin-bottom: 16px; text-align: justify;">${p.trim()}</p>`;
    }
  });

  // 4. Source attribution line
  const attribution = isOriginal ? 'জনবার্তা বিশেষ অনুসন্ধান ডেস্ক' : (sourceFeed || 'জনবার্তা ডেস্ক');
  html += `
  <div style="margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b; font-weight: 600;">
    📌 তথ্যসূত্র: ${attribution}
  </div>`;

  html += `</div>`;
  return html;
}

/**
 * Publish story directly to Blogger blog via Blogger API v3
 */
async function publishToBlogger({
  title,
  summary,
  paragraphs,
  imageUrl,
  category = 'জাতীয়',
  sourceFeed,
  isOriginal = false
}) {
  const blogId = getBloggerBlogId();
  const isConfigured = Boolean(
    blogId &&
    getBloggerClientId() &&
    getBloggerClientSecret() &&
    getBloggerRefreshToken() &&
    !blogId.includes('placeholder')
  );

  if (!isConfigured) {
    console.log('[BLOGGER] Credentials not fully configured in env — operating in dry-run/portal fallback mode.');
    return {
      configured: false,
      postUrl: null,
      postId: null
    };
  }

  try {
    const accessToken = await getAccessToken();
    const contentHtml = buildBloggerHtml({
      summary,
      paragraphs,
      imageUrl,
      sourceFeed,
      isOriginal
    });

    const labels = [category];
    if (isOriginal) {
      labels.push('নিজস্ব প্রতিবেদন');
      labels.push('বিশেষ সংবাদ');
    }

    const payload = {
      kind: 'blogger#post',
      title: title.trim(),
      content: contentHtml,
      labels
    };

    console.log(`[BLOGGER] Publishing to Blog ID ${blogId}: "${title.slice(0, 60)}..."`);
    const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`;
    const res = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const postData = res.data;
    console.log(`[BLOGGER] Successfully published! Post URL: ${postData.url}`);

    return {
      configured: true,
      success: true,
      postId: postData.id,
      postUrl: postData.url,
      publishedAt: postData.published
    };
  } catch (err) {
    const errData = err.response?.data?.error?.message || err.message;
    console.error(`[BLOGGER] Publish failed: ${errData}`);
    return {
      configured: true,
      success: false,
      error: errData,
      postUrl: null,
      postId: null
    };
  }
}

/**
 * Fetch recent published posts from Blogger API v3
 */
async function getRecentBloggerPosts(maxResults = 10) {
  const blogId = getBloggerBlogId();
  const isConfigured = Boolean(
    blogId &&
    getBloggerClientId() &&
    getBloggerClientSecret() &&
    getBloggerRefreshToken() &&
    !blogId.includes('placeholder')
  );

  if (!isConfigured) return [];

  try {
    const accessToken = await getAccessToken();
    const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=${maxResults}`;
    const res = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 10000
    });
    return res.data?.items || [];
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.warn(`[BLOGGER] Could not fetch recent posts: ${msg}`);
    return [];
  }
}

module.exports = {
  publishToBlogger,
  getAccessToken,
  buildBloggerHtml,
  getRecentBloggerPosts,
  isBloggerConfigured: () => Boolean(
    getBloggerBlogId() &&
    getBloggerClientId() &&
    getBloggerClientSecret() &&
    getBloggerRefreshToken() &&
    !getBloggerBlogId().includes('placeholder')
  )
};
