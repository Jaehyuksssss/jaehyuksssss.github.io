import { supabase } from './supabaseClient'

function debugEnabled(): boolean {
  try {
    if (process.env.NODE_ENV !== 'production') return true
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('debugSupabase') === '1') return true
    if (localStorage.getItem('debug_supabase') === '1') return true
  } catch {}
  return false
}

export type SliceScore = {
  rank: number
  nickname: string
  best_score: number
  updated_at: string
}

export async function submitBallSliceScore(params: {
  nickname: string
  last4: string
  score: number
}): Promise<boolean> {
  if (!supabase || typeof window === 'undefined') return false
  const nickname = params.nickname.trim()
  const last4 = params.last4.trim()
  const score = Math.max(0, Math.round(params.score || 0))
  if (!/^.{2,16}$/.test(nickname)) return false
  if (!/^\d{4}$/.test(last4)) return false

  const { error } = await supabase.rpc('bs_submit_score', {
    p_nickname: nickname,
    p_last4: last4,
    p_score: score,
  })
  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error('[Supabase] bs_submit_score error', {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      })
    }
    return false
  }
  return true
}

export async function fetchTopBallSliceScores(limit = 10): Promise<SliceScore[]> {
  if (!supabase || typeof window === 'undefined') return []
  const { data, error } = await supabase.rpc('bs_top_scores', { p_limit: limit })
  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error('[Supabase] bs_top_scores error', error)
    }
    return []
  }
  return (data || []) as SliceScore[]
}

