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
  try {
    const clientId = getClientId()
    const ua = navigator.userAgent
    const path = location.pathname

    // 게임 세션 로그
    await supabase.from("reaction_sessions").insert({
      session_id: payload.sessionId,
      client_id: clientId,
      event: "start",
      difficulty: payload.difficulty,
      time_limit_sec: payload.timeLimitSec,
      initial_grid: payload.initialGrid,
      user_agent: ua,
      path,
    })

    // 총 게임 횟수 증가 (난이도 무관)
    await supabase.rpc("increment_total_game_count")
  } catch (e) {
    // swallow
  }
}

export async function logSessionEnd(payload: EndPayload) {
  if (!supabase || typeof window === "undefined") return
  try {
    const clientId = getClientId()
    const ua = navigator.userAgent
    const path = location.pathname
    await supabase.from("reaction_sessions").insert({
      session_id: payload.sessionId,
      client_id: clientId,
      event: "end",
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
    })
  } catch (e) {
    // swallow
  }
}
