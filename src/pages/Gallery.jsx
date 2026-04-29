import { useState, useEffect, useCallback } from 'react'
import FilterTabs from '../components/FilterTabs.jsx'
import CoverGrid from '../components/CoverGrid.jsx'
import { fetchItems } from '../lib/supabase.js'
import './Gallery.css'

const PAGE_SIZE = 20

export default function Gallery() {
  const [filter, setFilter] = useState(null)
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (type, pageNum) => {
    setLoading(true)
    try {
      const data = await fetchItems({ type, page: pageNum, pageSize: PAGE_SIZE })
      if (pageNum === 0) {
        setItems(data)
      } else {
        setItems((prev) => [...prev, ...data])
      }
      setHasMore(data.length === PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(0)
    setItems([])
    load(filter, 0)
  }, [filter, load])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    load(filter, next)
  }

  return (
    <div className="gallery">
      <FilterTabs active={filter} onChange={setFilter} />
      <CoverGrid
        items={items}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loading}
      />
    </div>
  )
}
