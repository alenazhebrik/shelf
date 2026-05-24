// src/test/AddSheet.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AddSheet from '../components/AddSheet'

describe('AddSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('VITE_SHELF_API_KEY', 'test-key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('renders title input, type buttons, and add button', () => {
    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^film$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^show$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^book$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument()
  })

  it('disables Add button when title is empty', () => {
    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled()
  })

  it('calls onSuccess with returned item on successful submit', async () => {
    const item = { id: '1', title: 'Dune', type: 'film', cover_url: 'https://x.com/dune.jpg' }
    fetch.mockResolvedValue({ ok: true, json: async () => item })
    const onSuccess = vi.fn()

    render(<AddSheet onSuccess={onSuccess} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Dune')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(item))
    expect(fetch).toHaveBeenCalledWith('/api/add', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Dune', type: 'film' }),
    }))
  })

  it('shows error message on failed submit', async () => {
    fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: "Couldn't find that title" }) })

    render(<AddSheet onSuccess={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText(/title/i), 'Unknown Movie')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => expect(screen.getByText(/couldn't find that title/i)).toBeInTheDocument())
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<AddSheet onSuccess={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
