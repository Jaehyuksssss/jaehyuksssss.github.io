import { supabase } from "./supabaseClient"

function debugEnabled(): boolean {
  try {
    if (process.env.NODE_ENV !== "production") return true
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("debugSupabase") === "1") return true
    if (localStorage.getItem("debug_supabase") === "1") return true
  } catch {}
  return false
}

export type OppositeScore = {
  rank: number
  nickname: string
  best_score: number
  best_rounds: number
  best_streak: number
  best_reaction_ms: number | null
  updated_at: string
}

export async function submitOppositeClickScore(params: {
  nickname: string
  last4: string
  score: number
  rounds: number
  streak: number
  reactionMs: number | null
}): Promise<boolean> {
  if (!supabase || typeof window === "undefined") return false
  const nickname = params.nickname.trim()
  const last4 = params.last4.trim()
  if (!/^.{2,16}$/.test(nickname)) return false
  if (!/^\d{4}$/.test(last4)) return false
  const score = Math.max(0, Math.round(params.score || 0))
  const rounds = Math.max(0, Math.round(params.rounds || 0))
  const streak = Math.max(0, Math.round(params.streak || 0))
  const reaction =
    params.reactionMs == null ? null : Math.max(0, Math.round(params.reactionMs))

  const { error } = await supabase.rpc("oc_submit_score", {
    p_nickname: nickname,
    p_last4: last4,
    p_score: score,
    p_rounds: rounds,
    p_streak: streak,
    p_reaction_ms: reaction,
  })

  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error("[Supabase] oc_submit_score error", {
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

export async function fetchTopOppositeScores(limit = 10): Promise<OppositeScore[]> {
  if (!supabase || typeof window === "undefined") return []
  const { data, error } = await supabase.rpc("oc_top_scores", { p_limit: limit })
  if (error) {
    if (debugEnabled()) {
      // eslint-disable-next-line no-console
      console.error("[Supabase] oc_top_scores error", error)
    }
    return []
  }
  return (data || []) as OppositeScore[]
}
