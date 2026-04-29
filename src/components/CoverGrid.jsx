import CoverCard from './CoverCard.jsx'
import './CoverGrid.css'

export default function CoverGrid({ items, onLoadMore, hasMore, loading }) {
  return (
    <div className="cover-grid-wrap">
      <div className="cover-grid">
        {items.map((item) => (
          <CoverCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <button
          className="load-more"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      {!loading && items.length === 0 && (
        <p className="empty">Nothing here yet.</p>
      )}
    </div>
  )
}
