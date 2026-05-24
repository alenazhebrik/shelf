# Shelf PWA — Rewrite Design

**Date:** 2026-05-24
**Status:** Approved

## Overview

Complete rewrite of the React frontend from scratch. The existing Vercel/Supabase backend (`api/telegram.js`, Supabase schema) stays untouched. A new `api/add.js` endpoint replaces Telegram as the primary way to add items.

## What We're Building

A personal media tracking app — covers for films, TV shows, and books, browsable in a clean dark grid. You add something by typing its title in the app; the backend fetches the cover automatically.

---

## Stack

- **Vite + React + plain CSS** — same as the current codebase
- **vite-plugin-pwa** — keep existing config, installable on iPhone via Safari
- **Supabase anon client** — read-only, `src/lib/supabase.js` stays unchanged
- **No React Router** — single page, active tab managed with `useState`
- **No state management library** — local state only

---

## Components

Five components total:

| Component | Responsibility |
|-----------|---------------|
| `App` | Active tab state, add-sheet visibility, passes new item to grid on success |
| `TabBar` | Fixed bottom bar — Films / Shows / Books |
| `CoverGrid` | 3-column cover grid, load-more pagination |
| `CoverCard` | Single cover image, 2:3 aspect ratio, no tap action |
| `AddSheet` | Bottom sheet — title input, type selector, submit |

### Component tree

```
App
├── TabBar (fixed bottom)
├── CoverGrid
│   └── CoverCard (× N)
└── AddSheet (conditionally rendered)
```

---

## Screens & States

### Grid (default)
- Page title (current tab name) top-left, large bold white
- Small "+" circle button top-right
- 3-column cover grid below, newest first
- Fixed bottom tab bar

### Add sheet (+ tapped)
- Grid dims behind a backdrop
- Sheet slides up from bottom
- Drag handle at top
- Title text input (autofocused)
- Film / Show / Book segmented selector (Film pre-selected)
- "Add" button (white, full width)
- Tap outside or drag down to dismiss

### Success
- Sheet dismisses
- New cover appears at top of grid (prepended, no full reload)
- Brief toast: "Added [Title]" fades in and out after 2s

### Empty state
- Centered text: "Nothing here yet" in muted colour
- Shown when a tab has zero items

### Loading state
- Skeleton cover cards (animated dim rectangles) while Supabase fetch is in flight

---

## Visual Spec

### Colours
```
Background:        #000000
Surface (cards):   #1c1c1e
Input / controls:  #2c2c2e
Border:            #333333
Text primary:      #ffffff
Text secondary:    #888888
Accent (iOS blue): #0a84ff
```

### Tab bar
- Fixed to bottom, above home indicator
- 16px SVG icons, 7px labels below
- Active tab: full white (opacity 1)
- Inactive tabs: white at 40% opacity
- Background: #111111, 1px top border #222222

### Cover grid
- 3 equal columns, 4px gaps, 10px side padding
- Each cover: 2:3 aspect ratio, 5px border radius
- Covers are pure images — no label, no overlay

### Add sheet
- Border radius 14px top corners
- 32px wide drag handle, 3px tall, #444444
- Input: 8px border radius, #2c2c2e background
- Type buttons: equal width, 7px border radius; active = #0a84ff, inactive = #2c2c2e
- Add button: white background, black bold text, 10px border radius

### Safe area
- Top content padding: `env(safe-area-inset-top)`
- Tab bar bottom padding: `env(safe-area-inset-bottom)`

---

## Data Flow

### Reading (grid)
1. Tab changes → fetch from Supabase: `items` filtered by `type`, ordered `added_at DESC`, page size 30
2. "Load more" fetches next page and appends to list
3. `src/lib/supabase.js` is the only data access layer (unchanged)

### Writing (add sheet)
1. User submits title + type → `POST /api/add` with `{ title, type }`
2. On success: if active tab matches the new item's type, prepend it to the grid; show toast regardless
3. On error: show inline error in the sheet ("Couldn't find that title — try a different spelling")

---

## New Backend: `api/add.js`

### Auth
Checks `Authorization: Bearer <SHELF_API_KEY>` header. `SHELF_API_KEY` is a new env var (server-side only). The frontend sends it from `VITE_SHELF_API_KEY` (embedded at build time — acceptable for a personal app).

### Request
```json
POST /api/add
{ "title": "The White Lotus", "type": "show" }
```

### Logic
- `film` / `show` → search OMDB (`?s=...`), take first result, fetch full record
- `book` → search Open Library (`/search.json?q=...`), take first result
- Download cover image → upload to Supabase Storage bucket `covers`
- Insert row into `items` table
- Return saved item as JSON

### Error responses
- `404` — title not found in OMDB / Open Library
- `400` — missing or invalid `title` / `type`
- `401` — missing or wrong API key

---

## Files

### Delete entirely
All files under `src/` except `src/lib/supabase.js`.

### Keep unchanged
- `api/telegram.js`
- `src/lib/supabase.js`
- `supabase/schema.sql`
- `vite.config.js`
- `index.html`
- `package.json`
- `vercel.json`

### New files
```
src/
  App.jsx
  App.css
  main.jsx          (rewrite: no router)
  index.css         (reset + CSS custom properties)
  components/
    TabBar.jsx
    TabBar.css
    CoverGrid.jsx
    CoverGrid.css
    CoverCard.jsx
    CoverCard.css
    AddSheet.jsx
    AddSheet.css
api/
  add.js            (new endpoint)
```

### Environment variables (additions)
```
SHELF_API_KEY          # server-side — protects /api/add
VITE_SHELF_API_KEY     # build-time — sent from the PWA
```

---

## Out of Scope (MVP)

- Detail view / separate screen per item
- Delete / edit items
- Search within the shelf
- Multi-user support
- Light mode
- Articles tab
- Telegram bot changes
