// supabaseClient.ts
import { createClient } from "@supabase/supabase-js"
import { externalServicesEnabled } from './externalServices'

const url = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.GATSBY_SUPABASE_URL
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.GATSBY_SUPABASE_ANON_KEY

export const supabase = externalServicesEnabled && url && key ? createClient(url, key) : undefined

if (typeof window !== "undefined" && externalServicesEnabled) {
  if (!url || !key) {
    console.warn(
      "[Supabase] Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY to enable counters and scores."
    )
  } else if (!supabase) {
    console.warn("[Supabase] createClient returned undefined")
  }
}
