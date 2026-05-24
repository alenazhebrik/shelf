import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import TabBar from '../components/TabBar'

describe('TabBar', () => {
  it('renders three tabs', () => {
    render(<TabBar active="film" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /films/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /shows/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /books/i })).toBeInTheDocument()
  })

  it('marks the active tab with aria-selected', () => {
    render(<TabBar active="show" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /shows/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /films/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab type', async () => {
    const onChange = vi.fn()
    render(<TabBar active="film" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: /books/i }))
    expect(onChange).toHaveBeenCalledWith('book')
  })
})
