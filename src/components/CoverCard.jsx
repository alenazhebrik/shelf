import './CoverCard.css'

export default function CoverCard({ item }) {
  return (
    <div className="cover-card">
      {item.cover_url ? (
        <img
          src={item.cover_url}
          alt={item.title}
          className="cover-img"
          loading="lazy"
        />
      ) : (
        <div className="cover-placeholder" aria-label={item.title} />
      )}
    </div>
  )
}
