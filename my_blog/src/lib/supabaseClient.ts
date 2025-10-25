// supabaseClient.ts
import { createClient } from "@supabase/supabase-js"

const url = process.env.GATSBY_SUPABASE_URL
const key = process.env.GATSBY_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : undefined

if (typeof window !== "undefined") {
  if (!url || !key) {
    console.warn(
      "[Supabase] Missing env. Set GATSBY_SUPABASE_URL and GATSBY_SUPABASE_ANON_KEY and restart dev server."
    )
  } else if (!supabase) {
    console.warn("[Supabase] createClient returned undefined")
  }
}
