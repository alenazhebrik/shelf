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
