# Jonobarta (জনবার্তা) — Google Cloud Blogger API v3 Setup Guide

> **Target**: Connect the Jonobarta AI News Agent directly to your Blogger blog (`jonobarta.com` / `jonobarta-news.blogspot.com`) so that articles and original news briefings are automatically published with featured images, labels, and SEO-friendly HTML.
> 
> **Prerequisites**: A Google account that owns or has admin rights on your Blogger blog.

---

## Overview of Environment Variables Needed

Once this setup is complete, you will add the following 4 environment variables to your Render dashboard (and your local `.env`):

| Variable Name | Description | Example |
|---|---|---|
| `BLOGGER_BLOG_ID` | The numeric ID of your blog on Blogger | `8912345678901234567` |
| `BLOGGER_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud | `1234567890-abc...apps.googleusercontent.com` |
| `BLOGGER_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud | `GOCSPX-abc123xyz...` |
| `BLOGGER_REFRESH_TOKEN` | Long-lived refresh token allowing 24/7 publishing | `1//04abc...` |

---

## Step 1: Find Your `BLOGGER_BLOG_ID` (1 Minute)

1. Open your browser and go to [blogger.com](https://www.blogger.com).
2. Select your **Jonobarta (জনবার্তা)** blog from the dropdown on the top-left.
3. Look at your browser's address bar. The URL will look like:
   ```
   https://www.blogger.com/blog/posts/8912345678901234567
   ```
4. The long number at the very end (`8912345678901234567`) is your **`BLOGGER_BLOG_ID`**.
5. Copy and save this number.

---

## Step 2: Create a Google Cloud Project & Enable Blogger API v3 (3 Minutes)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with the same Google account that manages your Blogger blog.
3. In the top navigation bar, click the project dropdown and click **"New Project"**.
   - **Project Name**: `Jonobarta News Engine`
   - Click **"Create"**.
4. Make sure your new project is selected in the top bar.
5. In the search bar at the top, type **`Blogger API v3`** and press Enter.
6. Click on **Blogger API v3** from the marketplace/APIs list.
7. Click the blue **"ENABLE"** button.

---

## Step 3: Configure the OAuth Consent Screen (3 Minutes)

1. In the left navigation menu, go to **APIs & Services** → **OAuth consent screen**.
2. Select **External** as the User Type and click **"Create"**.
3. Fill in the required fields:
   - **App name**: `Jonobarta News Publisher`
   - **User support email**: Select your email address.
   - **Developer contact information**: Enter your email address.
   - Click **"Save and Continue"**.
4. **Scopes step**: Click **"Add or Remove Scopes"**.
   - Search for `blogger` or find `https://www.googleapis.com/auth/blogger`.
   - Check the box next to `.../auth/blogger` (Manage your Blogger account).
   - Click **"Update"**, then click **"Save and Continue"**.
5. **Test users step**:
   - Click **"+ Add Users"**.
   - Enter your personal Google email (the one that owns the Blogger blog).
   - Click **"Add"**, then click **"Save and Continue"**.
6. Review the summary and click **"Back to Dashboard"**.

---

## Step 4: Create OAuth 2.0 Client Credentials (2 Minutes)

1. In the left menu, click **Credentials**.
2. Click **"+ CREATE CREDENTIALS"** at the top and select **"OAuth client ID"**.
3. Choose Application type:
   - Select **Web application** (or **Desktop app**).
   - **Name**: `Jonobarta Automation Client`
4. Under **Authorized redirect URIs**, click **"+ ADD URI"** and enter:
   ```
   https://developers.google.com/oauthplayground
   ```
5. Click **"CREATE"**.
6. A dialog box will pop up displaying:
   - **Your Client ID** → Copy this as `BLOGGER_CLIENT_ID`.
   - **Your Client Secret** → Copy this as `BLOGGER_CLIENT_SECRET`.

---

## Step 5: Generate the Long-Lived Refresh Token (2 Minutes)

We will use Google's official OAuth Playground to get your refresh token:

1. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) in a new tab.
2. In the top-right corner, click the **Settings icon (⚙️)**:
   - Check the box **"Use your own OAuth credentials"**.
   - In **OAuth Client ID**, paste your `BLOGGER_CLIENT_ID`.
   - In **OAuth Client secret**, paste your `BLOGGER_CLIENT_SECRET`.
   - Close the settings panel.
3. On the left side under **Step 1: Select & authorize APIs**:
   - Scroll down to find **Blogger v3**, or in the input box at the bottom ("Input your own scopes"), type:
     ```
     https://www.googleapis.com/auth/blogger
     ```
   - Click the blue **"Authorize APIs"** button.
4. Google will ask you to sign in:
   - Choose your account.
   - If you see a warning screen saying "Google hasn't verified this app", click **"Advanced"** and then **"Go to Jonobarta News Publisher (unsafe)"**.
   - Click **"Continue"** / **"Allow"** to grant permissions.
5. You will be redirected back to the OAuth Playground at **Step 2: Exchange authorization code for tokens**:
   - Click the blue button: **"Exchange authorization code for tokens"**.
6. Look at the response fields on the right side:
   - You will see **"Refresh token"** (starts with `1//...`).
   - Copy this value! This is your **`BLOGGER_REFRESH_TOKEN`**.
   *(Note: The refresh token never expires unless you revoke it in your Google Account security settings).*

---

## Step 6: Add Variables to Render & Local Environment

### On Render (Production):
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Select your web service (`daily-news-harness`).
3. Click **Environment** in the left sidebar.
4. Add the 4 environment variables:
   ```env
   BLOGGER_BLOG_ID=8912345678901234567
   BLOGGER_CLIENT_ID=1234567890-xxx.apps.googleusercontent.com
   BLOGGER_CLIENT_SECRET=GOCSPX-xxx
   BLOGGER_REFRESH_TOKEN=1//04xxx
   ```
5. Click **Save Changes**. Render will automatically redeploy.

### Locally (for testing):
Add the same 4 variables to your local `.env` file in the project root.

---

## Verification & Testing

Once added, the Jonobarta harness automatically detects the credentials:
- Run `GET /health` or `GET /status`.
- You will see `"bloggerConfigured": true`.
- On every news cycle or when triggering `GET /trigger`, the harness will:
  1. Refresh the Google access token automatically.
  2. Format the story with the feature image at top, lead excerpt, paragraphs, and source attribution.
  3. Publish directly to Blogger under labels like `জাতীয়`, `রাজনীতি`, etc.
  4. Return the live Blogger post URL (e.g. `https://jonobarta-news.blogspot.com/2026/10/slug.html`).
  5. Send this exact Blogger URL to Make.com so Facebook posts link directly to your blog!
