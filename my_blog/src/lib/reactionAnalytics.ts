import { supabase } from "./supabaseClient"

export type Difficulty = "easy" | "medium" | "hard"

type StartPayload = {
  sessionId: string
  difficulty: Difficulty
  timeLimitSec: number
  initialGrid: number
}

type EndPayload = {
  sessionId: string
  difficulty: Difficulty
  rounds: number
  avgMs: number
  times: number[]
  timeLimitSec: number
  initialGrid: number
  startedAt: number
  endedAt: number
}

const CLIENT_ID_KEY = "reaction_game_client_id"

function debugEnabled(): boolean {
  try {
    if (process.env.NODE_ENV !== "production") return true
    const sp = new URLSearchParams(window.location.search)
    if (sp.get("debugSupabase") === "1") return true
    if (localStorage.getItem("debug_supabase") === "1") return true
  } catch {}
  return false
}

function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY)
    if (existing) return existing
    const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
    localStorage.setItem(CLIENT_ID_KEY, id)
    return id
  } catch {
    return "anon"
  }
}

export async function logSessionStart(payload: StartPayload) {
  if (!supabase || typeof window === "undefined") return
  const clientId = getClientId()
  const ua = navigator.userAgent
  const path = location.pathname
  const row = {
    session_id: payload.sessionId,
    client_id: clientId,
    event: "start" as const,
    difficulty: payload.difficulty,
    time_limit_sec: payload.timeLimitSec,
    initial_grid: payload.initialGrid,
    user_agent: ua,
    path,
  }
  const { error } = await supabase.rpc("log_reaction_start", row as any)
  if (error && debugEnabled()) {
    // Surface detailed error in dev to help diagnose 400s
    // eslint-disable-next-line no-console
    console.error("[Supabase] insert start failed", {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: error.code,
      row,
    })
  }
}

export async function logSessionEnd(payload: EndPayload) {
  if (!supabase || typeof window === "undefined") return
  const clientId = getClientId()
  const ua = navigator.userAgent
  const path = location.pathname
  const row = {
    session_id: payload.sessionId,
    client_id: clientId,
    event: "end" as const,
    difficulty: payload.difficulty,
    rounds: payload.rounds,
    avg_ms: Math.round(payload.avgMs || 0),
    hits: payload.times?.length || 0,
    times_ms: payload.times || [],
    time_limit_sec: payload.timeLimitSec,
    initial_grid: payload.initialGrid,
    started_at_ms: Math.round(payload.startedAt),
    ended_at_ms: Math.round(payload.endedAt),
    user_agent: ua,
    path,
  }
  const { error } = await supabase.rpc("log_reaction_end", row as any)
  if (error && debugEnabled()) {
    // eslint-disable-next-line no-console
    console.error("[Supabase] insert end failed", {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: error.code,
      row,
    })
  }
}
