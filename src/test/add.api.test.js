// src/test/add.api.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @supabase/supabase-js before importing handler
vi.mock('@supabase/supabase-js', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({}))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert, update: mockUpdate }))
  const mockGetPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/cover.jpg' } }))
  const mockUpload = vi.fn(() => ({ error: null }))
  const mockStorageFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }))
  const mockClient = { from: mockFrom, storage: { from: mockStorageFrom } }

  return { createClient: vi.fn(() => mockClient) }
})

import handler from '../../api/add.js'

function makeReqRes(body = {}, headers = {}) {
  const req = { method: 'POST', body, headers: { authorization: 'Bearer test-key', ...headers } }
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  }
  return { req, res }
}

describe('POST /api/add', () => {
  beforeEach(() => {
    process.env.SHELF_API_KEY = 'test-key'
    process.env.OMDB_API_KEY = 'omdb-key'
    process.env.SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = makeReqRes()
    req.method = 'GET'
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 401 when API key is missing', async () => {
    const { req, res } = makeReqRes({}, { authorization: undefined })
    req.headers = {}
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when API key is wrong', async () => {
    const { req, res } = makeReqRes({ title: 'Dune', type: 'film' }, { authorization: 'Bearer wrong-key' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 400 when title is missing', async () => {
    const { req, res } = makeReqRes({ type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when type is invalid', async () => {
    const { req, res } = makeReqRes({ title: 'Dune', type: 'magazine' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 404 when OMDB finds nothing', async () => {
    fetch.mockResolvedValue({ json: async () => ({ Response: 'False' }) })
    const { req, res } = makeReqRes({ title: 'xyzzy', type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns 200 with saved item for a valid film', async () => {
    // OMDB search → detail
    fetch
      .mockResolvedValueOnce({ json: async () => ({ Response: 'True', Search: [{ imdbID: 'tt1234567' }] }) })
      .mockResolvedValueOnce({ json: async () => ({ Response: 'True', Title: 'Dune', Poster: 'http://img.com/dune.jpg', Type: 'movie' }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8), headers: { get: () => 'image/jpeg' } })

    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient()
    client.from().insert().select().single.mockResolvedValue({
      data: { id: 'abc', type: 'film', title: 'Dune', cover_url: null },
      error: null,
    })

    const { req, res } = makeReqRes({ title: 'Dune', type: 'film' })
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dune' }))
  })
})
