// src/components/CoverGrid.jsx
import { useState, useEffect, useCallback } from 'react'
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

  const load = useCallback(async (pageNum) => {
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
  }, [type])

  useEffect(() => {
    setItems([])
    setPage(0)
    setHasMore(true)
    setError(null)
    load(0)
  }, [type, load])

  useEffect(() => {
    if (!newItem) return
    if (newItem.type === type) {
      setItems(prev => [newItem, ...prev])
    }
    onNewItemConsumed()
  }, [newItem, type, onNewItemConsumed])

  function loadMore() {
    if (loading) return
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
