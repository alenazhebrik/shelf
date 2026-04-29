import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchItems({ type = null, page = 0, pageSize = 20 } = {}) {
  let query = supabase
    .from('items')
    .select('id, type, title, cover_url, source_url, added_at')
    .order('added_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchItem(id) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
