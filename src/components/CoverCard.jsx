import { useNavigate } from 'react-router-dom'
import './CoverCard.css'

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231c1c1e'/%3E%3C/svg%3E"

export default function CoverCard({ item }) {
  const navigate = useNavigate()

  return (
    <button className="cover-card" onClick={() => navigate(`/item/${item.id}`)}>
      <img
        className="cover-card__img"
        src={item.cover_url || FALLBACK}
        alt={item.title}
        loading="lazy"
        onError={(e) => { e.currentTarget.src = FALLBACK }}
      />
    </button>
  )
}
