import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

type Options = {
  oncePerSession?: boolean
  coolDownMinutes?: number // cookie-based cool-down per slug
  // When true, use a single global cool-down key across the whole site
  // so only one increment occurs per coolDown window regardless of slug.
  globalCoolDown?: boolean
}

export default function useSupabaseViewCount(
  slug?: string,
  options: Options = {}
) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || typeof window === "undefined") return
    if (!supabase) return
    const { oncePerSession = false, coolDownMinutes } = options

    let cancelled = false
    async function run() {
      // Cookie-based cool-down (per slug by default, or global when enabled)
      if (coolDownMinutes && coolDownMinutes > 0) {
        try {
          const cookieKey = options.globalCoolDown
            ? `views_cd___global__`
            : `views_cd_${encodeURIComponent(slug ?? "")}`
          const match = document.cookie.match(
            new RegExp(`(?:^|; )${cookieKey}=([^;]*)`)
          )
          const until = match ? parseInt(decodeURIComponent(match[1]), 10) : 0
          const now = Date.now()
          if (until && until > now) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[Views] skip inc (cooldown)", slug)
            }
            return
          }
          // set new cooldown immediately to avoid duplicates in strict mode
          const next = now + coolDownMinutes * 60 * 1000
          const expires = new Date(next).toUTCString()
          document.cookie = `${cookieKey}=${encodeURIComponent(
            String(next)
          )}; expires=${expires}; path=/; SameSite=Lax`
        } catch (_) {}
      }

      if (oncePerSession) {
        try {
          const flagKey = `views:session:${slug}`
          const flag = sessionStorage.getItem(flagKey)
          if (flag) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[Views] skip inc (session)", slug)
            }
            return
          }
          // mark before await to avoid double calls in strict-mode
          sessionStorage.setItem(flagKey, "1")
        } catch (_) {}
      }
      setLoading(true)
      setError(null)
      try {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[Views] inc_post_view slug =", slug)
        }
        const { data, error } = await supabase!.rpc("inc_post_view", {
          p_slug: slug,
        })
        if (error) throw error
        if (!cancelled) setCount(Number(data))
      } catch (e: any) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Views] inc_post_view error:", e?.message || e)
        }
        if (!cancelled) setError(e?.message || "Failed to increment views")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    slug,
    options.oncePerSession,
    options.coolDownMinutes,
    options.globalCoolDown,
  ])

  return { count, loading, error }
}
