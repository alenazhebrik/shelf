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
