# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (localhost:5173)
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # ESLint
```

To test the Telegram bot locally, use [ngrok](https://ngrok.com/) to expose a local port and re-register the webhook pointing to your ngrok URL.

## Architecture

This is a two-part project:

### Frontend — React PWA (`src/`)
- **Vite + vite-plugin-pwa**: builds a progressive web app installable on iOS via Safari
- **React Router**: two routes — `/` (Gallery) and `/item/:id` (Detail)
- `src/lib/supabase.js` is the only data access layer; it uses the public anon key to read-only from Supabase
- No state management library — local `useState`/`useEffect` only
- All styling is plain CSS co-located with each component (`*.css` next to `*.jsx`)
- Dark-first design; CSS custom properties in `src/index.css` control all colours and spacing

### Backend — Vercel serverless (`api/`)
- `api/telegram.js` is a single POST endpoint registered as a Telegram webhook
- It uses **Supabase service role key** (not anon) to write items and upload covers to Storage
- Cover images are fetched and re-hosted in Supabase Storage bucket `covers` so the PWA never depends on third-party image URLs
- Telegram callback state is encoded directly in `callback_data` strings (max 64 bytes) — no server-side session needed

### Data flow
1. User sends Telegram message → Vercel serverless function receives it
2. Function fetches metadata (OMDB API for films, Open Library for books, `og:` tag scraping for arbitrary URLs)
3. Sends inline keyboard confirmation to user
4. On button press (callback query): downloads cover → uploads to Supabase Storage → inserts row in `items` table
5. PWA reads from `items` via Supabase anon client (public RLS policy)

### Database
Schema is in `supabase/schema.sql`. The `items` table has a Row-Level Security policy that allows public reads (anon key) and restricts writes to the service role.

### Environment variables
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — used at build time (embedded in the PWA bundle)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only (Vercel serverless), never exposed to the client
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_ID`, `OMDB_API_KEY` — server-side only

See `SETUP.md` for full deployment steps.
