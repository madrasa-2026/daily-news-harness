# Jonobarta News Card Templates

This directory contains reusable layout definitions for Jonobarta's 1200×630 px news cards.

## How Card Templates Work

Each card template is defined as a pair of files inside its own folder under `/templates/<template-id>/` (or as a standalone `<template-id>.html` file):

1. **`template.json`**: Metadata describing the template name, description, author, and options.
2. **`template.html`**: The HTML/CSS canvas (exact dimensions 1200×630 px).

## Available Variables for Interpolation

When generating a card, the engine replaces the following placeholders in `template.html`:

| Variable | Description | Example |
|---|---|---|
| `{{headline}}` | Headline in Bengali (sanitized, auto-shrunk) | `জাতীয় সংসদে নতুন সংস্কার প্রস্তাবনা পাস` |
| `{{subtext}}` | 1–2 sentence summary or lead excerpt | `নাগরিক অধিকার ও জবাবদিহিতা নিশ্চিতে...` |
| `{{category}}` | Category badge text | `জাতীয়`, `রাজনীতি`, `অর্থনীতি` |
| `{{source}}` | Source attribution | `আমার দেশ`, `বিবিসি বাংলা`, `জনবার্তা ডেস্ক` |
| `{{dateStr}}` | Formatted Bengali date | `শনিবার, ১০ অক্টোবর ২০২৬` |
| `{{bgImage}}` | Background or feature image URL | `https://images.unsplash.com/...` |
| `{{fontSize}}` | Dynamically calculated font size (px) | `48` |

## Built-in Templates

1. `bold-headline`: Al Jazeera inspired crimson card with clean typography and high contrast.
2. `image-dominant`: TV news lower-third overlay style (Somoy TV / BBC Bangla look).
3. `minimal`: Clean light editorial style with subtle gray borders and sharp black typography.
4. `breaking-news`: High-urgency flash style with red badge, dark background, and alert accents.
5. `quote-style`: Editorial statements with large quotation marks and speaker prominence.
6. `dark-premium`: Obsidian dark background with gold accents and badge highlights.

## Adding a Custom Template

To add a new design without touching the core code:
1. Create a new folder under `/templates/<your-template-id>/` (e.g. `templates/my-custom-card/`).
2. Add `template.json`:
   ```json
   {
     "id": "my-custom-card",
     "name": "My Custom Card",
     "description": "Custom branded news card",
     "author": "Jonobarta Design Team"
   }
   ```
3. Add `template.html` with fixed width `1200px` and height `630px`:
   ```html
   <!DOCTYPE html>
   <html lang="bn">
   <head>
     <meta charset="UTF-8">
     <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@600;700;800&display=swap" rel="stylesheet">
     <style>
       * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
       body { width: 1200px; height: 630px; background: #0f172a; color: #fff; padding: 50px; }
       h1 { font-size: {{fontSize}}px; }
     </style>
   </head>
   <body>
     <span class="cat">{{category}}</span>
     <h1>{{headline}}</h1>
     <p>{{subtext}}</p>
     <footer>{{source}} • {{dateStr}}</footer>
   </body>
   </html>
   ```
4. Switch to it by setting `ACTIVE_CARD_TEMPLATE=my-custom-card` in `.env` or sending a POST to `/template` with `{"template": "my-custom-card"}`.
