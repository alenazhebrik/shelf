# Shelf PWA Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Shelf PWA frontend from scratch — dark cover grid, Spotify-style bottom tab bar, in-app "+" add flow — backed by a new `api/add.js` endpoint that fetches covers automatically from OMDB and Open Library.

**Architecture:** Single-page React app (no router), five components managed by `App`. A new `api/add.js` Vercel serverless endpoint handles title search, cover download, Supabase write, and returns the saved item. `src/lib/supabase.js` and `api/telegram.js` are left entirely untouched.

**Tech Stack:** Vite + React + plain CSS, vite-plugin-pwa, @supabase/supabase-js, Vitest + React Testing Library, Vercel serverless (Node)

---

## File Map

```
src/
  index.css                  CSS variables, reset, global styles
  main.jsx                   Entry point — no router
  App.jsx                    Tab state, add-sheet visibility, success handler
  App.css                    App shell layout, header, + button
  lib/
    supabase.js              ← KEEP UNCHANGED (exports fetchItems, fetchItem)
  components/
    TabBar.jsx               Bottom nav — Films / Shows / Books
    TabBar.css
    CoverCard.jsx            Single cover image, 2:3 ratio, no tap action
    CoverCard.css
    CoverGrid.jsx            3-col grid, load-more, empty + skeleton states
    CoverGrid.css
    AddSheet.jsx             Bottom sheet — title input, type selector, submit
    AddSheet.css
    Toast.jsx                Success/error notification, auto-fades
    Toast.css
  test/
    setup.js                 @testing-library/jest-dom import

api/
  add.js                     POST /api/add — search → cover → insert → return item
  telegram.js                ← KEEP UNCHANGED

vitest.config.js             Separate from vite.config.js — keeps vite config clean
```

---

## Task 1: Clean up old src files + install test dependencies

**Files:**
- Delete: `src/App.jsx`, `src/components/CoverCard.jsx`, `src/components/CoverCard.css`, `src/components/CoverGrid.jsx`, `src/components/CoverGrid.css`, `src/components/FilterTabs.jsx`, `src/components/FilterTabs.css`, `src/pages/Gallery.jsx`, `src/pages/Gallery.css`, `src/pages/Detail.jsx`, `src/pages/Detail.css`
- Modify: `package.json`

- [ ] **Step 1: Delete old src files**

```bash
rm src/App.jsx \
   src/components/CoverCard.jsx src/components/CoverCard.css \
   src/components/CoverGrid.jsx src/components/CoverGrid.css \
   src/components/FilterTabs.jsx src/components/FilterTabs.css \
   src/pages/Gallery.jsx src/pages/Gallery.css \
   src/pages/Detail.jsx src/pages/Detail.css
rmdir src/pages 2>/dev/null || true
```

- [ ] **Step 2: Remove react-router-dom, add test dependencies**

```bash
npm remove react-router-dom
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 3: Add test script to package.json**

Open `package.json`. In `"scripts"`, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

Final scripts block:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0",
  "test": "vitest",
  "test:run": "vitest run"
}
```

- [ ] **Step 4: Verify no import errors remain**

```bash
npm run lint 2>&1 | head -20
```

Expected: errors only about missing files we'll create — no module-not-found from old imports. (lint may fail hard — that's fine, we just want to confirm react-router-dom is gone)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove old src files, add vitest + testing-library"
```

---

## Task 2: Vitest config + test setup file

**Files:**
- Create: `vitest.config.js`
- Create: `src/test/setup.js`

- [ ] **Step 1: Create vitest.config.js**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 2: Create src/test/setup.js**

```bash
mkdir -p src/test
```

```js
// src/test/setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Verify Vitest runs**

```bash
npm test -- --run 2>&1 | tail -5
```

Expected: `No test files found` (zero tests yet — that's fine, not a failure)

- [ ] **Step 4: Commit**

```bash
git add vitest.config.js src/test/setup.js
git commit -m "chore: add vitest config and test setup"
```

---

## Task 3: CSS foundation — index.css

**Files:**
- Rewrite: `src/index.css`

- [ ] **Step 1: Rewrite index.css**

```css
/* src/index.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #000;
  --surface: #1c1c1e;
  --input: #2c2c2e;
  --border: #333;
  --text-primary: #fff;
  --text-secondary: #888;
  --accent: #0a84ff;
}

body {
  background: var(--bg);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

button {
  font-family: inherit;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: CSS variables and global reset"
```

---

## Task 4: Entry point — main.jsx

**Files:**
- Rewrite: `src/main.jsx`

- [ ] **Step 1: Rewrite main.jsx — no router**

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Commit**

```bash
git add src/main.jsx
git commit -m "refactor: remove router from entry point"
```

---

## Task 5: TabBar component (TDD)

**Files:**
- Create: `src/components/TabBar.jsx`
- Create: `src/components/TabBar.css`
- Create: `src/test/TabBar.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/TabBar.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import TabBar from '../components/TabBar'

describe('TabBar', () => {
  it('renders three tabs', () => {
    render(<TabBar active="film" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /films/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /shows/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /books/i })).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected', () => {
    render(<TabBar active="show" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /shows/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /films/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab type', async () => {
    const onChange = vi.fn()
    render(<TabBar active="film" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /books/i }))
    expect(onChange).toHaveBeenCalledWith('book')
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run src/test/TabBar.test.jsx 2>&1 | tail -10
```

Expected: FAIL — `TabBar` not found

- [ ] **Step 3: Create TabBar.jsx**

```jsx
// src/components/TabBar.jsx
import './TabBar.css'

const TABS = [
  { type: 'film',  label: 'Films', icon: FilmIcon },
  { type: 'show',  label: 'Shows', icon: TvIcon },
  { type: 'book',  label: 'Books', icon: BookIcon },
]

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tab-bar" role="tablist">
      {TABS.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          role="tab"
          aria-selected={active === type}
          className={`tab-item ${active === type ? 'tab-item--active' : ''}`}
          onClick={() => onChange(type)}
        >
          <Icon />
          <span className="tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
    </svg>
  )
}

function TvIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h12v16zM8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  )
}
```

- [ ] **Step 4: Create TabBar.css**

```css
/* src/components/TabBar.css */
.tab-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #111;
  border-top: 1px solid var(--border);
  padding: 8px 0 calc(env(safe-area-inset-bottom) + 4px);
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--text-primary);
  opacity: 0.4;
  cursor: pointer;
  padding: 4px 20px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s;
}

.tab-item--active {
  opacity: 1;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2px;
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npm test -- --run src/test/TabBar.test.jsx 2>&1 | tail -10
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/TabBar.jsx src/components/TabBar.css src/test/TabBar.test.jsx
git commit -m "feat: TabBar component"
```

---

## Task 6: CoverCard component (TDD)

**Files:**
- Create: `src/components/CoverCard.jsx`
- Create: `src/components/CoverCard.css`
- Create: `src/test/CoverCard.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/test/CoverCard.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CoverCard from '../components/CoverCard'

const item = { id: '1', title: 'Dune', cover_url: 'https://example.com/dune.jpg', type: 'film' }
const itemNoCover = { id: '2', title: 'No Cover', cover_url: null, type: 'book' }

describe('CoverCard', () => {
  it('renders the cover image when cover_url is present', () => {
    render(<CoverCard item={item} />)
    const img = screen.getByRole('img', { name: /dune/i })
    expect(img).toHaveAttribute('src', item.cover_url)
  })

  it('renders a placeholder when cover_url is null', () => {
    render(<CoverCard item={itemNoCover} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/no cover/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run src/test/CoverCard.test.jsx 2>&1 | tail -10
```

Expected: FAIL — `CoverCard` not found

- [ ] **Step 3: Create CoverCard.jsx**

```jsx
// src/components/CoverCard.jsx
import './CoverCard.css'

export default function CoverCard({ item }) {
  return (
    <div className="cover-card">
      {item.cover_url ? (
        <img
          src={item.cover_url}
          alt={item.title}
          className="cover-img"
          loading="lazy"
        />
      ) : (
        <div className="cover-placeholder" aria-label={item.title} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create CoverCard.css**

```css
/* src/components/CoverCard.css */
.cover-card {
  aspect-ratio: 2 / 3;
  border-radius: 5px;
  overflow: hidden;
  background: var(--surface);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: var(--surface);
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npm test -- --run src/test/CoverCard.test.jsx 2>&1 | tail -10
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/CoverCard.jsx src/components/CoverCard.css src/test/CoverCard.test.jsx
git commit -m "feat: CoverCard component"
```

---

## Task 7: Toast component

**Files:**
- Create: `src/components/Toast.jsx`
- Create: `src/components/Toast.css`

- [ ] **Step 1: Create Toast.jsx**

```jsx
// src/components/Toast.jsx
import './Toast.css'

export default function Toast({ message }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-check" aria-hidden="true">✓</span>
      {message}
    </div>
  )
}
```

- [ ] **Step 2: Create Toast.css**

```css
/* src/components/Toast.css */
.toast {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 80px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  color: var(--text-primary);
  padding: 10px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  z-index: 20;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  animation: toast-fade 2.5s ease forwards;
  pointer-events: none;
}

.toast-check {
  color: var(--accent);
}

@keyframes toast-fade {
  0%   { opacity: 0; transform: translateX(-50%) translateY(8px); }
  12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
  70%  { opacity: 1; }
  100% { opacity: 0; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Toast.jsx src/components/Toast.css
git commit -m "feat: Toast notification component"
```

---

## Task 8: AddSheet component (TDD)

**Files:**
- Create: `src/components/AddSheet.jsx`
- Create: `src/components/AddSheet.css`
- Create: `src/test/AddSheet.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/test/AddSheet.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AddSheet from '../components/AddSheet'

describe('AddSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('VITE_SHELF_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('renders title input, type buttons, and add button', () => {
    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^film$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^show$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^book$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument()
  })

  it('disables Add button when title is empty', () => {
    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled()
  })

  it('calls onSuccess with returned item on successful submit', async () => {
    const item = { id: '1', title: 'Dune', type: 'film', cover_url: 'https://x.com/dune.jpg' }
    fetch.mockResolvedValue({ ok: true, json: async () => item })
    const onSuccess = vi.fn()

    render(<AddSheet onSuccess={onSuccess} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Dune')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(item))
    expect(fetch).toHaveBeenCalledWith('/api/add', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Dune', type: 'film' }),
    }))
  })

  it('shows error message on failed submit', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Couldn't find that title" }) })

    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Unknown Movie')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(screen.getByText(/couldn't find that title/i)).toBeInTheDocument())
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<AddSheet onSuccess={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run src/test/AddSheet.test.jsx 2>&1 | tail -10
```

Expected: FAIL — `AddSheet` not found

- [ ] **Step 3: Create AddSheet.jsx**

```jsx
// src/components/AddSheet.jsx
import { useState, useRef, useEffect } from 'react'
import './AddSheet.css'

const TYPES = ['film', 'show', 'book']
const TYPE_LABELS = { film: 'Film', show: 'Show', book: 'Book' }

export default function AddSheet({ onSuccess, onClose }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('film')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SHELF_API_KEY}`,
        },
        body: JSON.stringify({ title: title.trim(), type }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || (res.status === 404 ? "Couldn't find that title" : 'Something went wrong'))
      }
      const item = await res.json()
      onSuccess(item)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="sheet-backdrop" data-testid="sheet-backdrop" onClick={onClose} />
      <div className="add-sheet" role="dialog" aria-label="Add to shelf">
        <div className="sheet-handle" />
        <h2 className="sheet-title">Add to shelf</h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="sheet-input"
            placeholder="Title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={loading}
          />
          <div className="type-selector">
            {TYPES.map(t => (
              <button
                key={t}
                type="button"
                className={`type-btn ${type === t ? 'type-btn--active' : ''}`}
                onClick={() => setType(t)}
                disabled={loading}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {error && <p className="sheet-error">{error}</p>}
          <button
            type="submit"
            className="sheet-submit"
            disabled={loading || !title.trim()}
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Create AddSheet.css**

```css
/* src/components/AddSheet.css */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.add-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: 14px 14px 0 0;
  padding: 10px 16px calc(env(safe-area-inset-bottom) + 16px);
  z-index: 11;
  animation: slide-up 0.25s ease;
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.sheet-handle {
  width: 32px;
  height: 3px;
  background: #444;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.sheet-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px;
}

.sheet-input {
  width: 100%;
  background: var(--input);
  border: none;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  margin-bottom: 10px;
}

.sheet-input::placeholder { color: var(--text-secondary); }

.type-selector {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.type-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 7px;
  background: var(--input);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.type-btn--active {
  background: var(--accent);
  color: #fff;
}

.sheet-error {
  font-size: 13px;
  color: #ff453a;
  margin: 0 0 10px;
}

.sheet-submit {
  width: 100%;
  padding: 12px;
  background: #fff;
  color: #000;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.sheet-submit:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npm test -- --run src/test/AddSheet.test.jsx 2>&1 | tail -10
```

Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/AddSheet.jsx src/components/AddSheet.css src/test/AddSheet.test.jsx
git commit -m "feat: AddSheet component"
```

---

## Task 9: CoverGrid component (TDD)

**Files:**
- Create: `src/components/CoverGrid.jsx`
- Create: `src/components/CoverGrid.css`
- Create: `src/test/CoverGrid.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/test/CoverGrid.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CoverGrid from '../components/CoverGrid'

vi.mock('../lib/supabase', () => ({
  fetchItems: vi.fn(),
}))

import { fetchItems } from '../lib/supabase'

const makeItems = (n, type = 'film') =>
  Array.from({ length: n }, (_, i) => ({
    id: `${i}`,
    title: `Title ${i}`,
    cover_url: `https://example.com/${i}.jpg`,
    type,
  }))

describe('CoverGrid', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows skeleton while loading', () => {
    fetchItems.mockReturnValue(new Promise(() => {}))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    expect(document.querySelectorAll('.cover-skeleton').length).toBeGreaterThan(0)
  })

  it('renders items after load', async () => {
    fetchItems.mockResolvedValue(makeItems(3))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(3))
  })

  it('shows empty state when no items', async () => {
    fetchItems.mockResolvedValue([])
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument())
  })

  it('shows error state on fetch failure', async () => {
    fetchItems.mockRejectedValue(new Error('Network error'))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument())
  })

  it('prepends newItem of matching type to grid', async () => {
    fetchItems.mockResolvedValue(makeItems(2))
    const onNewItemConsumed = vi.fn()
    const { rerender } = render(
      <CoverGrid type="film" newItem={null} onNewItemConsumed={onNewItemConsumed} />
    )
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(2))

    const newItem = { id: 'new', title: 'New Film', cover_url: 'https://example.com/new.jpg', type: 'film' }
    rerender(<CoverGrid type="film" newItem={newItem} onNewItemConsumed={onNewItemConsumed} />)

    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(3))
    expect(onNewItemConsumed).toHaveBeenCalled()
  })

  it('does not prepend newItem of different type', async () => {
    fetchItems.mockResolvedValue(makeItems(2))
    const onNewItemConsumed = vi.fn()
    const { rerender } = render(
      <CoverGrid type="film" newItem={null} onNewItemConsumed={onNewItemConsumed} />
    )
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(2))

    const newItem = { id: 'new', title: 'New Book', cover_url: 'https://example.com/new.jpg', type: 'book' }
    rerender(<CoverGrid type="film" newItem={newItem} onNewItemConsumed={onNewItemConsumed} />)

    await waitFor(() => expect(onNewItemConsumed).toHaveBeenCalled())
    expect(screen.getAllByRole('img').length).toBe(2)
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run src/test/CoverGrid.test.jsx 2>&1 | tail -10
```

Expected: FAIL — `CoverGrid` not found

- [ ] **Step 3: Create CoverGrid.jsx**

```jsx
// src/components/CoverGrid.jsx
import { useState, useEffect } from 'react'
import CoverCard from './CoverCard'
import { fetchItems } from '../lib/supabase'
import './CoverGrid.css'

const PAGE_SIZE = 30

export default function CoverGrid({ type, newItem, onNewItemConsumed }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setItems([])
    setPage(0)
    setHasMore(true)
    setError(null)
    load(0)
  }, [type])

  useEffect(() => {
    if (!newItem) return
    if (newItem.type === type) {
      setItems(prev => [newItem, ...prev])
    }
    onNewItemConsumed()
  }, [newItem])

  async function load(pageNum) {
    setLoading(true)
    try {
      const data = await fetchItems({ type, page: pageNum, pageSize: PAGE_SIZE })
      setItems(prev => pageNum === 0 ? data : [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next)
  }

  if (loading && items.length === 0) {
    return (
      <div className="grid-scroll">
        <div className="cover-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="cover-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="grid-message">Failed to load — {error}</div>
  }

  if (!loading && items.length === 0) {
    return <div className="grid-message">Nothing here yet</div>
  }

  return (
    <div className="grid-scroll">
      <div className="cover-grid">
        {items.map(item => <CoverCard key={item.id} item={item} />)}
        {loading && Array.from({ length: 3 }, (_, i) => (
          <div key={`skel-${i}`} className="cover-skeleton" />
        ))}
      </div>
      {hasMore && !loading && (
        <button className="load-more" onClick={loadMore}>Load more</button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create CoverGrid.css**

```css
/* src/components/CoverGrid.css */
.grid-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 10px 16px;
}

.cover-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.grid-message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 60vh;
  color: var(--text-secondary);
  font-size: 15px;
}

.cover-skeleton {
  aspect-ratio: 2 / 3;
  border-radius: 5px;
  background: var(--surface);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

.load-more {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: var(--surface);
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
npm test -- --run src/test/CoverGrid.test.jsx 2>&1 | tail -10
```

Expected: PASS — 6 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/CoverGrid.jsx src/components/CoverGrid.css src/test/CoverGrid.test.jsx
git commit -m "feat: CoverGrid component"
```

---

## Task 10: App shell — wire all components

**Files:**
- Create: `src/App.jsx`
- Create: `src/App.css`

- [ ] **Step 1: Create App.jsx**

```jsx
// src/App.jsx
import { useState } from 'react'
import TabBar from './components/TabBar'
import CoverGrid from './components/CoverGrid'
import AddSheet from './components/AddSheet'
import Toast from './components/Toast'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('film')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(null)
  const [toast, setToast] = useState(null)

  function handleSuccess(item) {
    setShowAdd(false)
    setNewItem(item)
    setToast(`Added ${item.title}`)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">{TAB_LABELS[activeTab]}</h1>
        <button
          className="add-btn"
          onClick={() => setShowAdd(true)}
          aria-label="Add item"
        >
          +
        </button>
      </header>
      <CoverGrid
        type={activeTab}
        newItem={newItem}
        onNewItemConsumed={() => setNewItem(null)}
      />
      <TabBar active={activeTab} onChange={setActiveTab} />
      {showAdd && (
        <AddSheet onSuccess={handleSuccess} onClose={() => setShowAdd(false)} />
      )}
      {toast && <Toast message={toast} />}
    </div>
  )
}

const TAB_LABELS = { film: 'Films', show: 'Shows', book: 'Books' }
```

- [ ] **Step 2: Create App.css**

```css
/* src/App.css */
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--bg);
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 8px) 16px 10px;
  flex-shrink: 0;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.add-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--surface);
  border: none;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 3: Run the dev server and visually verify**

```bash
npm run dev
```

Open http://localhost:5173. Check:
- [ ] Page title shows "Films"
- [ ] Tab bar at bottom with Films / Shows / Books icons
- [ ] Covers load (or empty state if Supabase has no data)
- [ ] "+" button top-right opens bottom sheet
- [ ] Tabs switch correctly

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/App.css
git commit -m "feat: App shell — wires all components"
```

---

## Task 11: New backend endpoint — api/add.js (TDD)

**Files:**
- Create: `api/add.js`
- Create: `src/test/add.api.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/test/add.api.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @supabase/supabase-js before importing handler
vi.mock('@supabase/supabase-js', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({}))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert, update: mockUpdate }))
  const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/cover.jpg' } }))
  const mockUpload = vi.fn(() => ({ error: null }))
  const mockStorageFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }))
  const mockClient = { from: mockFrom, storage: { from: mockStorageFrom } }

  return { createClient: vi.fn(() => mockClient) }
})

import handler from '../../api/add.js'

function makeReqRes(body = {}, headers = {}) {
  const req = { method: 'POST', body, headers: { authorization: 'Bearer test-key', ...headers } }
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return { req, res }
}

describe('POST /api/add', () => {
  beforeEach(() => {
    process.env.SHELF_API_KEY = 'test-key'
    process.env.OMDB_API_KEY = 'omdb-key'
    process.env.SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = makeReqRes()
    req.method = 'GET'
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 401 when API key is missing', async () => {
    const { req, res } = makeReqRes({}, { authorization: undefined })
    req.headers = {}
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when API key is wrong', async () => {
    const { req, res } = makeReqRes({ title: 'Dune', type: 'film' }, { authorization: 'Bearer wrong-key' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when title is missing', async () => {
    const { req, res } = makeReqRes({ type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when type is invalid', async () => {
    const { req, res } = makeReqRes({ title: 'Dune', type: 'magazine' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when OMDB finds nothing', async () => {
    fetch.mockResolvedValue({ json: async () => ({ Response: 'False' }) })
    const { req, res } = makeReqRes({ title: 'xyzzy', type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns 200 with saved item for a valid film', async () => {
    // OMDB search → detail
    fetch
      .mockResolvedValueOnce({ json: async () => ({ Response: 'True', Search: [{ imdbID: 'tt1234567' }] }) })
      .mockResolvedValueOnce({ json: async () => ({ Response: 'True', Title: 'Dune', Poster: 'http://img.com/dune.jpg', Type: 'movie' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8), headers: { get: () => 'image/jpeg' } })

    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient()
    client.from().insert().select().single.mockResolvedValue({
      data: { id: 'abc', type: 'film', title: 'Dune', cover_url: null },
      error: null,
    })

    const { req, res } = makeReqRes({ title: 'Dune', type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dune' }))
  })
})
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npm test -- --run src/test/add.api.test.js 2>&1 | tail -10
```

Expected: FAIL — `api/add.js` not found

- [ ] **Step 3: Create api/add.js**

```js
// api/add.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${process.env.SHELF_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { title, type } = req.body ?? {}
  if (!title || !['film', 'show', 'book'].includes(type)) {
    return res.status(400).json({ error: 'title and type (film|show|book) are required' })
  }

  let metadata = null
  try {
    metadata = await findMetadata(title, type)
  } catch (err) {
    console.error('Metadata fetch error:', err)
  }

  if (!metadata) {
    return res.status(404).json({ error: "Couldn't find that title — try a different spelling" })
  }

  try {
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        type,
        title: metadata.title,
        cover_url: null,
        source_url: null,
        added_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const coverUrl = metadata.imageUrl ? await uploadCover(metadata.imageUrl, item.id) : null
    if (coverUrl) {
      await supabase.from('items').update({ cover_url: coverUrl }).eq('id', item.id)
    }

    return res.status(200).json({ ...item, cover_url: coverUrl })
  } catch (err) {
    console.error('Save error:', err)
    return res.status(500).json({ error: 'Failed to save item' })
  }
}

async function findMetadata(title, type) {
  if (type === 'book') {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1&fields=title,cover_i`
    const res = await fetch(url)
    const data = await res.json()
    const doc = data.docs?.[0]
    if (!doc) return null
    return {
      title: doc.title,
      imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    }
  }

  const searchUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${process.env.OMDB_API_KEY}`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()
  if (searchData.Response !== 'True' || !searchData.Search?.length) return null

  const detailUrl = `https://www.omdbapi.com/?i=${searchData.Search[0].imdbID}&apikey=${process.env.OMDB_API_KEY}`
  const detailRes = await fetch(detailUrl)
  const detail = await detailRes.json()
  if (detail.Response !== 'True') return null

  return {
    title: detail.Title,
    imageUrl: detail.Poster !== 'N/A' ? detail.Poster : null,
  }
}

async function uploadCover(imageUrl, itemId) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `${itemId}.${ext}`
    const { error } = await supabase.storage
      .from('covers')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- --run src/test/add.api.test.js 2>&1 | tail -15
```

Expected: PASS — 7 tests. If the Supabase mock chain doesn't line up for the 200 test, adjust the mock setup to match the chain in `api/add.js` and re-run.

- [ ] **Step 5: Run all tests**

```bash
npm test -- --run 2>&1 | tail -15
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add api/add.js src/test/add.api.test.js
git commit -m "feat: api/add.js endpoint — search, cover upload, insert"
```

---

## Task 12: Environment variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update .env.example**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ADMIN_TELEGRAM_ID=
OMDB_API_KEY=
SHELF_API_KEY=
VITE_SHELF_API_KEY=
```

- [ ] **Step 2: Add SHELF_API_KEY to Vercel**

Generate a random key:
```bash
openssl rand -hex 32
```

Add to Vercel (both values must be the same string):
```bash
vercel env add SHELF_API_KEY
vercel env add VITE_SHELF_API_KEY
```

When prompted, select all environments (Production, Preview, Development) for both. Paste the same generated key for both.

- [ ] **Step 3: Pull env to local .env**

```bash
vercel env pull .env.local
```

Verify `.env.local` now contains `SHELF_API_KEY` and `VITE_SHELF_API_KEY`.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: add SHELF_API_KEY env vars to .env.example"
```

---

## Task 13: Build smoke test + add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers to .gitignore**

Open `.gitignore`, add:
```
.superpowers/
.env.local
```

- [ ] **Step 2: Run production build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds, `dist/` is generated, no errors.

- [ ] **Step 3: Preview the production build**

```bash
npm run preview
```

Open http://localhost:4173. Verify:
- [ ] App loads, tab bar shows, grid loads
- [ ] "+" button opens add sheet
- [ ] No console errors about missing env vars (VITE_SUPABASE_URL etc.)

- [ ] **Step 4: Run full test suite one final time**

```bash
npm test -- --run 2>&1 | tail -20
```

Expected: all tests pass

- [ ] **Step 5: Final commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers and .env.local to .gitignore"
```
