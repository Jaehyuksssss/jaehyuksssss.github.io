import { useEffect, useState } from 'react'

type UseViewCountOptions = {
  increment?: boolean
  namespace?: string
}

// Client-only view counter using CountAPI (no localStorage, works on GH Pages)
// - Namespace groups all keys for this site
// - Key is the post slug
export default function useViewCount(
  key: string | undefined,
  options: UseViewCountOptions = {}
) {
  const { increment = true, namespace = 'ghpages-blog' } = options

  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!key) return
    if (typeof window === 'undefined') return

    const controller = new AbortController()

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const base = 'https://api.countapi.xyz'
        const path = `${namespace}/${encodeURIComponent(key)}`
        const url = `${base}/${increment ? 'hit' : 'get'}/${path}`

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          // CountAPI is public and supports CORS; no headers required
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { value?: number }
        if (typeof data.value === 'number') setCount(data.value)
      } catch (e: any) {
        setError(e?.message || 'Failed to load view count')
      } finally {
        setLoading(false)
      }
    }

    run()

    return () => controller.abort()
  }, [key, increment, namespace])

  return { count, loading, error }
}

