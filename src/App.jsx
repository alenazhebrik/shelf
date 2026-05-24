// src/App.jsx
import { useState, useCallback, useRef } from 'react'
import TabBar from './components/TabBar'
import CoverGrid from './components/CoverGrid'
import AddSheet from './components/AddSheet'
import Toast from './components/Toast'
import './App.css'

const TAB_LABELS = { film: 'Films', show: 'Shows', book: 'Books' }

export default function App() {
  const [activeTab, setActiveTab] = useState('film')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const handleNewItemConsumed = useCallback(() => setNewItem(null), [])

  function handleSuccess(item) {
    clearTimeout(toastTimer.current)
    setShowAdd(false)
    setNewItem(item)
    setToast(`Added ${item.title}`)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
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
        onNewItemConsumed={handleNewItemConsumed}
      />
      <TabBar active={activeTab} onChange={setActiveTab} />
      {showAdd && (
        <AddSheet onSuccess={handleSuccess} onClose={() => setShowAdd(false)} />
      )}
      {toast && <Toast message={toast} />}
    </div>
  )
}
