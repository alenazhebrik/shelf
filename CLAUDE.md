# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (localhost:5173) — UI only
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # ESLint
npm test             # run Vitest in watch mode
npm run test:run     # run Vitest once (CI)
```

To test the full add flow locally (including `/api/add`), run `vercel dev` in a foreground terminal — it serves both the frontend and the serverless functions on one port.

## Architecture

This is a two-part project:

### Frontend — React PWA (`src/`)
- **Vite + vite-plugin-pwa**: builds a progressive web app installable on iOS via Safari
- **Single-page app, no router** — active tab managed with `useState` in `App.jsx`
- `src/lib/supabase.js` is the only data access layer; uses the public anon key for read-only access
- No state management library — local `useState`/`useEffect` only
- All styling is plain CSS co-located with each component (`*.css` next to `*.jsx`)
- Dark-first design; CSS custom properties in `src/index.css` control all colours and spacing
- Tests: Vitest + React Testing Library, config in `vitest.config.js`, setup in `src/test/setup.js`

### Components (`src/components/`)

| Component | Responsibility |
|-----------|---------------|
| `App` | Active tab state, add-sheet visibility, success/toast handler |
| `TabBar` | Fixed bottom bar — Films / Shows / Books |
| `CoverGrid` | 3-column cover grid, load-more pagination, skeleton + empty states |
| `CoverCard` | Single cover image, 2:3 aspect ratio |
| `AddSheet` | Bottom sheet — title input, type selector, submit to `/api/add` |
| `Toast` | Auto-fading success notification |

### Backend — Vercel serverless (`api/`)
- `api/add.js` — POST endpoint, primary way to add items. Takes `{ title, type }`, searches OMDB (films/shows) or Open Library (books), downloads cover, uploads to Supabase Storage, inserts row in `items` table. Protected by `SHELF_API_KEY`.
- `api/telegram.js` — legacy Telegram webhook, keep untouched.
- Both use **Supabase service role key** (not anon) to write to the database.

### Data flow
1. User taps `+` in the PWA → fills title + type → submits
2. `AddSheet` POSTs to `/api/add` with `Authorization: Bearer VITE_SHELF_API_KEY`
3. `api/add.js` searches OMDB or Open Library → downloads cover → uploads to Supabase Storage → inserts row in `items` table → returns saved item
4. On success: new cover prepended to the active grid, toast shown for 2.5s
5. PWA reads items from Supabase via anon client (public RLS policy)

### Database
Schema is in `supabase/schema.sql`. The `items` table has a Row-Level Security policy that allows public reads (anon key) and restricts writes to the service role.

### Environment variables

**Build-time (embedded in PWA bundle):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_SHELF_API_KEY` — sent as Bearer token with every `/api/add` request

**Server-side only (never exposed to client):**
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL`, used by `api/add.js`
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for writes
- `SHELF_API_KEY` — must match `VITE_SHELF_API_KEY`; protects `/api/add`
- `OMDB_API_KEY` — for film/show metadata lookup
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_ID` — Telegram bot only

See `.env.example` for the full list.
