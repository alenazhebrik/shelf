import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchItem } from '../lib/supabase.js'
import './Detail.css'

const TYPE_LABEL = { film: 'Film', book: 'Book', show: 'Show' }

export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchItem(id)
      .then(setItem)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="detail-loader" />

  if (!item) return (
    <div className="detail-error">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <p>Item not found.</p>
    </div>
  )

  const dateStr = new Date(item.added_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="detail">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="detail__cover-wrap">
        <img
          className="detail__cover"
          src={item.cover_url}
          alt={item.title}
        />
      </div>

      <div className="detail__info">
        <span className="detail__badge">{TYPE_LABEL[item.type] || item.type}</span>
        <h1 className="detail__title">{item.title}</h1>
        <p className="detail__date">Added {dateStr}</p>

        {item.source_url && (
          <a
            className="detail__link"
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source ↗
          </a>
        )}
      </div>
    </div>
  )
}
