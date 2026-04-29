import { createClient } from '@supabase/supabase-js'

// ── Supabase (service role — can write to storage) ──────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Telegram helpers ─────────────────────────────────────────────────────────
const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function tgCall(method, body) {
  const res = await fetch(`${TG}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

async function sendMessage(chatId, text, extra = {}) {
  return tgCall('sendMessage', { chat_id: chatId, text, ...extra })
}

async function sendPhoto(chatId, photo, caption, extra = {}) {
  return tgCall('sendPhoto', { chat_id: chatId, photo, caption, ...extra })
}

async function answerCallback(callbackQueryId, text = '') {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

// ── URL detection ────────────────────────────────────────────────────────────
function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : null
}

function classifyUrl(url) {
  if (/imdb\.com\/title\//i.test(url)) return 'imdb'
  if (/letterboxd\.com/i.test(url)) return 'letterboxd'
  if (/goodreads\.com/i.test(url)) return 'goodreads'
  if (/litres\.ru/i.test(url)) return 'litres'
  return 'unknown'
}

// ── Metadata fetchers ────────────────────────────────────────────────────────
async function fetchOmdb(imdbId) {
  const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${process.env.OMDB_API_KEY}`
  const res = await fetch(url)
  return res.json()
}

async function scrapeOgTags(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Shelf/1.0)' }
  })
  const html = await res.text()

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]

  return {
    title: ogTitle ? decodeHtmlEntities(ogTitle.trim()) : null,
    imageUrl: ogImage || null
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
}

async function searchOmdb(query) {
  const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=${process.env.OMDB_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.Response === 'True' && data.Search?.length) {
    // Get full record for the top hit
    return fetchOmdb(data.Search[0].imdbID)
  }
  return null
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1&fields=title,author_name,cover_i`
  const res = await fetch(url)
  const data = await res.json()
  const doc = data.docs?.[0]
  if (!doc) return null
  return {
    title: doc.title,
    imageUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null
  }
}

// ── Cover storage ────────────────────────────────────────────────────────────
async function uploadCover(imageUrl, itemId) {
  if (!imageUrl) return null
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

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    const { data } = supabase.storage.from('covers').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('Cover upload failed:', err)
    return null
  }
}

// ── DB write ─────────────────────────────────────────────────────────────────
async function saveItem({ type, title, coverUrl, sourceUrl, addedAt }) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      type,
      title,
      cover_url: coverUrl,
      source_url: sourceUrl || null,
      added_at: addedAt || new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Stats command ─────────────────────────────────────────────────────────────
async function getStats() {
  const { data, error } = await supabase
    .from('items')
    .select('type')

  if (error) throw error

  const counts = data.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1
    return acc
  }, {})

  return `📊 Your shelf:\n🎬 ${counts.film || 0} films\n📺 ${counts.show || 0} shows\n📚 ${counts.book || 0} books`
}

// ── Pending state (stored in Supabase for serverless statelessness) ───────────
// We store pending confirmations in a small temp table or just re-derive from callback data.
// Since Telegram callback_data is limited to 64 bytes, we embed the essentials.

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Validate webhook secret
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).end()
  }

  if (req.method !== 'POST') return res.status(405).end()

  const update = req.body
  const adminId = parseInt(process.env.ADMIN_TELEGRAM_ID, 10)

  // ── Callback query (inline keyboard button press) ──────────────────────────
  if (update.callback_query) {
    const cb = update.callback_query
    const chatId = cb.from.id

    if (chatId !== adminId) {
      await answerCallback(cb.id, 'Not authorized.')
      return res.status(200).end()
    }

    await answerCallback(cb.id)

    const data = cb.data
    if (!data || data === 'cancel') {
      await sendMessage(chatId, '❌ Cancelled.')
      return res.status(200).end()
    }

    // data format: "save|type|encodedTitle|encodedImageUrl|encodedSourceUrl"
    if (data.startsWith('save|')) {
      const parts = data.split('|')
      const type = parts[1]
      const title = decodeURIComponent(parts[2])
      const imageUrl = parts[3] ? decodeURIComponent(parts[3]) : null
      const sourceUrl = parts[4] ? decodeURIComponent(parts[4]) : null

      try {
        // Create item first to get an ID for the cover filename
        const { data: item, error } = await supabase
          .from('items')
          .insert({
            type,
            title,
            cover_url: null,
            source_url: sourceUrl || null,
            added_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error

        const coverUrl = await uploadCover(imageUrl, item.id)

        if (coverUrl) {
          await supabase.from('items').update({ cover_url: coverUrl }).eq('id', item.id)
        }

        const replyText = `✅ Added: *${title}* (${type})`
        if (coverUrl) {
          await sendPhoto(chatId, coverUrl, replyText, { parse_mode: 'Markdown' })
        } else {
          await sendMessage(chatId, replyText, { parse_mode: 'Markdown' })
        }
      } catch (err) {
        console.error('Save error:', err)
        await sendMessage(chatId, '❌ Failed to save. Try again.')
      }
    }

    return res.status(200).end()
  }

  // ── Regular message ────────────────────────────────────────────────────────
  const message = update.message
  if (!message?.text) return res.status(200).end()

  const chatId = message.chat.id
  const text = message.text.trim()
  const addedAt = new Date(message.date * 1000).toISOString()

  if (chatId !== adminId) {
    await sendMessage(chatId, 'This is a private shelf.')
    return res.status(200).end()
  }

  // /stats command
  if (text === '/stats' || text.startsWith('/stats@')) {
    try {
      const stats = await getStats()
      await sendMessage(chatId, stats)
    } catch {
      await sendMessage(chatId, 'Could not fetch stats.')
    }
    return res.status(200).end()
  }

  // /start
  if (text === '/start') {
    await sendMessage(chatId,
      'Hello! Send me:\n• An IMDB/Goodreads/Letterboxd/Litres URL\n• Any film/book title to search\n\nUse /stats to see your shelf.'
    )
    return res.status(200).end()
  }

  const url = extractUrl(text)

  if (url) {
    await sendMessage(chatId, '🔍 Fetching…')

    const kind = classifyUrl(url)
    let title = null
    let imageUrl = null
    let type = null

    try {
      if (kind === 'imdb') {
        // Extract IMDB ID from URL
        const imdbId = url.match(/title\/(tt\d+)/i)?.[1]
        if (!imdbId) throw new Error('Could not parse IMDB ID')
        const data = await fetchOmdb(imdbId)
        if (data.Response === 'True') {
          title = data.Title
          imageUrl = data.Poster !== 'N/A' ? data.Poster : null
          type = data.Type === 'series' ? 'show' : 'film'
        }
      } else if (kind === 'letterboxd') {
        const og = await scrapeOgTags(url)
        title = og.title
        imageUrl = og.imageUrl
        type = 'film'
      } else if (kind === 'goodreads' || kind === 'litres') {
        const og = await scrapeOgTags(url)
        title = og.title
        imageUrl = og.imageUrl
        type = 'book'
      } else {
        // Unknown URL — scrape and ask for type
        const og = await scrapeOgTags(url)
        title = og.title
        imageUrl = og.imageUrl
        type = null
      }

      if (!title) {
        await sendMessage(chatId, "❓ Couldn't extract a title from that URL. Try pasting the title directly.")
        return res.status(200).end()
      }

      if (type) {
        // Known type — ask for confirmation only
        await confirmItem(chatId, { title, imageUrl, type, sourceUrl: url })
      } else {
        // Unknown — ask what type it is
        await askType(chatId, { title, imageUrl, sourceUrl: url })
      }
    } catch (err) {
      console.error('URL handling error:', err)
      await sendMessage(chatId, '❌ Failed to fetch metadata. Try the title directly.')
    }

    return res.status(200).end()
  }

  // Plain text — search both OMDB and Open Library
  await sendMessage(chatId, '🔍 Searching…')

  try {
    const [omdbResult, bookResult] = await Promise.all([
      searchOmdb(text),
      searchOpenLibrary(text)
    ])

    const suggestions = []

    if (omdbResult?.Response === 'True') {
      const t = omdbResult.Type === 'series' ? 'show' : 'film'
      suggestions.push({
        label: `🎬 "${omdbResult.Title}" (${t})`,
        title: omdbResult.Title,
        imageUrl: omdbResult.Poster !== 'N/A' ? omdbResult.Poster : null,
        type: t,
        sourceUrl: null
      })
    }

    if (bookResult?.title) {
      suggestions.push({
        label: `📚 "${bookResult.title}" (book)`,
        title: bookResult.title,
        imageUrl: bookResult.imageUrl,
        type: 'book',
        sourceUrl: null
      })
    }

    if (suggestions.length === 0) {
      await sendMessage(chatId, "🤷 Nothing found. Check the spelling or paste a direct URL.")
      return res.status(200).end()
    }

    const keyboard = suggestions.map((s) => [{
      text: s.label,
      callback_data: buildCallbackData('save', s.type, s.title, s.imageUrl, s.sourceUrl)
    }])
    keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel' }])

    await sendMessage(chatId, 'What did you finish?', {
      reply_markup: { inline_keyboard: keyboard }
    })
  } catch (err) {
    console.error('Search error:', err)
    await sendMessage(chatId, '❌ Search failed. Try again.')
  }

  return res.status(200).end()
}

// ── Helper: build callback_data (max 64 bytes) ────────────────────────────────
function buildCallbackData(action, type, title, imageUrl, sourceUrl) {
  // Truncate title to keep within 64-byte Telegram limit
  const enc = (s) => encodeURIComponent(s || '').slice(0, 15)
  const payload = `${action}|${type}|${encodeURIComponent(title).slice(0, 30)}|${enc(imageUrl)}|${enc(sourceUrl)}`
  return payload.slice(0, 64)
}

// ── Helper: send confirmation keyboard (known type) ───────────────────────────
async function confirmItem(chatId, { title, imageUrl, type, sourceUrl }) {
  const typeLabel = { film: '🎬 Film', show: '📺 Show', book: '📚 Book' }[type] || type
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `✅ Save as ${typeLabel}`,
          callback_data: buildCallbackData('save', type, title, imageUrl, sourceUrl)
        },
        { text: '❌ Cancel', callback_data: 'cancel' }
      ]
    ]
  }

  if (imageUrl) {
    await sendPhoto(chatId, imageUrl, `*${title}*`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  } else {
    await sendMessage(chatId, `*${title}*\nType: ${typeLabel}`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  }
}

// ── Helper: ask type when unknown ─────────────────────────────────────────────
async function askType(chatId, { title, imageUrl, sourceUrl }) {
  const types = [
    { label: '🎬 Film', value: 'film' },
    { label: '📺 Show', value: 'show' },
    { label: '📚 Book', value: 'book' }
  ]

  const keyboard = {
    inline_keyboard: [
      types.map((t) => ({
        text: t.label,
        callback_data: buildCallbackData('save', t.value, title, imageUrl, sourceUrl)
      })),
      [{ text: '❌ Cancel', callback_data: 'cancel' }]
    ]
  }

  if (imageUrl) {
    await sendPhoto(chatId, imageUrl, `*${title}*\n\nWhat type is this?`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  } else {
    await sendMessage(chatId, `*${title}*\n\nWhat type is this?`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  }
}
