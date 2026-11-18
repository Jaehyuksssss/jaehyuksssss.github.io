import { supabase } from './supabaseClient'
import { RULESET, type Handling, type ReplayEvent } from '../../supabase/functions/_shared/tetris-engine'

export type Ranking = { rank: number; nickname: string; score: number; lines: number; level: number; own: boolean }
export type Board = { top: Ranking[]; me: Ranking | null; next_score: number | null }
export type Run = { id: string; seed: number }
export type PendingScore = { run: Run; ticks: number; events: ReplayEvent[]; handling: Handling; score: number; input: string; created: number }
export const onlineAvailable = !!supabase
function token(): string {
  let value = localStorage.getItem('tetris-player-v1')
  if (!value || !/^[a-f0-9]{64}$/.test(value)) {
    value = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join('')
    localStorage.setItem('tetris-player-v1',value)
  }
  return value
}
async function call<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('현재는 이 기기의 기록만 저장됩니다.')
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const { data, error } = await Promise.race([
      supabase.functions.invoke('tetris', { body: { ...body, token: token(), ruleset: RULESET } }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('순위 서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.')),8000) }),
    ])
    if (error || data?.error) {
      let message = data?.error
      if (error?.context instanceof Response) { try { message = (await error.context.json()).error } catch {} }
      throw new Error(message || '순위 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    return data as T
  } finally { clearTimeout(timeout) }
}
export const startRankedRun = () => call<Run>({ action: 'start' })
export const loadLeaderboard = () => call<Board>({ action: 'top' })
export const submitRun = (pending: PendingScore, nickname: string) => call<Board>({
  action: 'submit', runId: pending.run.id, ticks: pending.ticks, events: pending.events,
  handling: pending.handling, input: pending.input, nickname,
})
