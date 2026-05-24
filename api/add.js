// api/add.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${process.env.SHELF_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { title, type } = req.body ?? {}
  if (!title || !['film', 'show', 'book'].includes(type)) {
    return res.status(400).json({ error: 'title and type (film|show|book) are required' })
  }

  let metadata = null
  try {
    metadata = await findMetadata(title, type)
  } catch (err) {
    console.error('Metadata fetch error:', err)
  }

  if (!metadata) {
    return res.status(404).json({ error: "Couldn't find that title — try a different spelling" })
  }

  try {
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        type,
        title: metadata.title,
        cover_url: null,
        source_url: null,
        added_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const coverUrl = metadata.imageUrl ? await uploadCover(metadata.imageUrl, item.id) : null
    if (coverUrl) {
      await supabase.from('items').update({ cover_url: coverUrl }).eq('id', item.id)
    }

    return res.status(200).json({ ...item, cover_url: coverUrl })
  } catch (err) {
    console.error('Save error:', err)
    return res.status(500).json({ error: 'Failed to save item' })
  }
}

async function findMetadata(title, type) {
  if (type === 'book') {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1&fields=title,cover_i`
    const res = await fetch(url)
    const data = await res.json()
    const doc = data.docs?.[0]
    if (!doc) return null
    return {
      title: doc.title,
      imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    }
  }

  const searchUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&apikey=${process.env.OMDB_API_KEY}`
  const searchRes = await fetch(searchUrl)
  const searchData = await searchRes.json()
  if (searchData.Response !== 'True' || !searchData.Search?.length) return null

  const detailUrl = `https://www.omdbapi.com/?i=${searchData.Search[0].imdbID}&apikey=${process.env.OMDB_API_KEY}`
  const detailRes = await fetch(detailUrl)
  const detail = await detailRes.json()
  if (detail.Response !== 'True') return null

  return {
    title: detail.Title,
    imageUrl: detail.Poster !== 'N/A' ? detail.Poster : null,
  }
}

async function uploadCover(imageUrl, itemId) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `${itemId}.${ext}`
    const { error } = await supabase.storage
      .from('covers')
      .upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}
