import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.GATSBY_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.GATSBY_SUPABASE_ANON_KEY

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : undefined

if (typeof window !== 'undefined' && !supabase) {
  // Helps diagnose when no network call happens in dev
  console.warn('[Supabase] Missing env. Set GATSBY_SUPABASE_URL and GATSBY_SUPABASE_ANON_KEY and restart dev server.')
}
