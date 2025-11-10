import { supabase } from './supabaseClient'

export type PublicScore = {
  rank: number
  nickname: string
  best_avg_ms: number
  best_single_ms: number
  updated_at: string
}

export async function submitTimeMatchScore(params: {
  nickname: string
  last4: string
  avgMs: number
  singleMs: number
}): Promise<boolean> {
  if (!supabase || typeof window === 'undefined') return false
  const nickname = params.nickname.trim()
  const last4 = params.last4.trim()
  if (!/^.{2,16}$/.test(nickname)) return false
  if (!/^\d{4}$/.test(last4)) return false
  const avgMs = Math.max(0, Math.round(params.avgMs || 0))
  const singleMs = Math.max(0, Math.round(params.singleMs || 0))

  const { error } = await supabase.rpc('tm_submit_score', {
    p_nickname: nickname,
    p_last4: last4,
    p_avg_ms: avgMs,
    p_single_ms: singleMs,
  })
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Supabase] tm_submit_score error', error)
    }
    return false
  }
  return true
}

export async function fetchTopTimeMatchScores(limit = 20): Promise<PublicScore[]> {
  if (!supabase || typeof window === 'undefined') return []
  const { data, error } = await supabase.rpc('tm_top_scores', {
    p_limit: limit,
  })
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Supabase] tm_top_scores error', error)
    }
    return []
  }
  return (data || []) as PublicScore[]
}

