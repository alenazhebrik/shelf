import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CoverCard from '../components/CoverCard'

const item = { id: '1', title: 'Dune', cover_url: 'https://example.com/dune.jpg', type: 'film' }
const itemNoCover = { id: '2', title: 'No Cover', cover_url: null, type: 'book' }

describe('CoverCard', () => {
  it('renders the cover image when cover_url is present', () => {
    render(<CoverCard item={item} />)
    const img = screen.getByRole('img', { name: /dune/i })
    expect(img).toHaveAttribute('src', item.cover_url)
  })

  it('renders a placeholder when cover_url is null', () => {
    render(<CoverCard item={itemNoCover} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/no cover/i)).toBeInTheDocument()
  })
})
