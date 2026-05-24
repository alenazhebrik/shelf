// src/test/CoverGrid.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import CoverGrid from '../components/CoverGrid'

vi.mock('../lib/supabase', () => ({
  fetchItems: vi.fn(),
}))

import { fetchItems } from '../lib/supabase'

const makeItems = (n, type = 'film') =>
  Array.from({ length: n }, (_, i) => ({
    id: `${i}`,
    title: `Title ${i}`,
    cover_url: `https://example.com/${i}.jpg`,
    type,
  }))

describe('CoverGrid', () => {
  afterEach(() => vi.clearAllMocks())

  it('shows skeleton while loading', () => {
    fetchItems.mockReturnValue(new Promise(() => {}))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    expect(document.querySelectorAll('.cover-skeleton').length).toBeGreaterThan(0)
  })

  it('renders items after load', async () => {
    fetchItems.mockResolvedValue(makeItems(3))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(3))
  })

  it('shows empty state when no items', async () => {
    fetchItems.mockResolvedValue([])
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument())
  })

  it('shows error state on fetch failure', async () => {
    fetchItems.mockRejectedValue(new Error('Network error'))
    render(<CoverGrid type="film" newItem={null} onNewItemConsumed={() => {}} />)
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument())
  })

  it('prepends newItem of matching type to grid', async () => {
    fetchItems.mockResolvedValue(makeItems(2))
    const onNewItemConsumed = vi.fn()
    const { rerender } = render(
      <CoverGrid type="film" newItem={null} onNewItemConsumed={onNewItemConsumed} />
    )
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(2))

    const newItem = { id: 'new', title: 'New Film', cover_url: 'https://example.com/new.jpg', type: 'film' }
    rerender(<CoverGrid type="film" newItem={newItem} onNewItemConsumed={onNewItemConsumed} />)

    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(3))
    expect(onNewItemConsumed).toHaveBeenCalled()
  })

  it('does not prepend newItem of different type', async () => {
    fetchItems.mockResolvedValue(makeItems(2))
    const onNewItemConsumed = vi.fn()
    const { rerender } = render(
      <CoverGrid type="film" newItem={null} onNewItemConsumed={onNewItemConsumed} />
    )
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(2))

    const newItem = { id: 'new', title: 'New Book', cover_url: 'https://example.com/new.jpg', type: 'book' }
    rerender(<CoverGrid type="film" newItem={newItem} onNewItemConsumed={onNewItemConsumed} />)

    await waitFor(() => expect(onNewItemConsumed).toHaveBeenCalled())
    expect(screen.getAllByRole('img').length).toBe(2)
  })
})
