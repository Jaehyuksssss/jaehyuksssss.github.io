import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function useSupabaseTotalViews() {
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!supabase) return

    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        // Prefer RPC if available
        const { data, error } = await supabase.rpc('get_total_views')
        if (error) throw error
        if (!cancelled) setTotal(Number(data))
      } catch (eRpc: any) {
        // Fallback: client-side sum if RLS allows select
        try {
          const { data, error } = await supabase
            .from('post_views')
            .select('view_count')
          if (error) throw error
          const sum = (data || []).reduce((acc, row: any) => acc + Number(row.view_count || 0), 0)
          if (!cancelled) setTotal(sum)
        } catch (e: any) {
          if (!cancelled) setError(e?.message || 'Failed to load total views')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return { total, loading, error }
}
