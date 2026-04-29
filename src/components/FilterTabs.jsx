import './FilterTabs.css'

const TABS = [
  { label: 'All', value: null },
  { label: 'Films', value: 'film' },
  { label: 'Shows', value: 'show' },
  { label: 'Books', value: 'book' },
]

export default function FilterTabs({ active, onChange }) {
  return (
    <nav className="filter-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.label}
          className={`tab ${active === tab.value ? 'tab--active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
