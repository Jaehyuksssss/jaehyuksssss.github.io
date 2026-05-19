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

export type OmokScore = {
  rank: number
  nickname: string
  best_streak: number
  updated_at: string
}

export async function submitOmokScore(params: {
  nickname: string
  last4: string
  streak: number
}): Promise<boolean> {
  if (!supabase || typeof window === 'undefined') return false
  const nickname = params.nickname.trim()
  const last4 = params.last4.trim()
  const streak = Math.max(0, Math.round(params.streak || 0))
  if (!/^.{2,16}$/.test(nickname)) return false
  if (!/^\d{4}$/.test(last4)) return false

  const { error } = await supabase.rpc('omok_submit_score', {
    p_nickname: nickname,
    p_last4: last4,
    p_streak: streak,
  })
  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error('[Supabase] omok_submit_score error', {
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

export async function fetchTopOmokScores(limit = 10): Promise<OmokScore[]> {
  if (!supabase || typeof window === 'undefined') return []
  const { data, error } = await supabase.rpc('omok_top_scores', { p_limit: limit })
  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error('[Supabase] omok_top_scores error', error)
    }
    return []
  }
  return (data || []) as OmokScore[]
}

