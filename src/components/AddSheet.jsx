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
      setLoading(false)
      onSuccess(item)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div className="sheet-backdrop" data-testid="sheet-backdrop" onClick={onClose} />
      <div className="add-sheet" role="dialog" aria-modal="true" aria-label="Add to shelf">
        <div className="sheet-handle" />
        <h2 className="sheet-title">Add to shelf</h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            aria-label="Title"
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
