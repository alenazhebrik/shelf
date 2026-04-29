# Deployment Guide

## 1. Get a free OMDB API key
Go to https://www.omdbapi.com/apikey.aspx — free tier gives 1,000 requests/day.

## 2. Set up Supabase
1. Create a free project at supabase.com
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
3. Go to **Storage** → create a new bucket called `covers` → set it to **Public**
4. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Deploy to Vercel
1. Push this repo to GitHub
2. Import it at vercel.com
3. Add these environment variables in Vercel → Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_WEBHOOK_SECRET=choose-any-random-string
ADMIN_TELEGRAM_ID=your-telegram-numeric-id
OMDB_API_KEY=your-omdb-key
```

> **ADMIN_TELEGRAM_ID**: Find your numeric Telegram ID by messaging @userinfobot on Telegram.

4. Deploy. Note your Vercel URL (e.g. `https://cinematic-xyz.vercel.app`)

## 4. Register the Telegram webhook
Run this once in your terminal (replace values):

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://cinematic-xyz.vercel.app/api/telegram" \
  -d "secret_token=<YOUR_WEBHOOK_SECRET>"
```

Confirm it worked:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## 5. Generate PWA icons
```bash
npm install sharp --save-dev
node generate-icons.mjs
rm generate-icons.mjs
```
Then redeploy.

## 6. Install on iPhone
1. Open Safari → navigate to your Vercel URL
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap Add

## 7. Test the bot
Send these to your bot:
- `/start` — welcome message
- `https://www.imdb.com/title/tt0133093/` — should add The Matrix as a film
- `The Great Gatsby` — should find book + film options
- `/stats` — should show counts
