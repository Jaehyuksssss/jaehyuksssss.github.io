// reactionLog.ts
import { supabase } from './supabaseClient'
export type Difficulty = 'easy' | 'medium' | 'hard';

type StartPayload = {
  sessionId: string;
  difficulty: Difficulty;
  timeLimitSec: number;
  initialGrid: number;
};

type EndPayload = {
  sessionId: string;
  difficulty: Difficulty;
  rounds: number;
  avgMs: number;    // 세션 평균 반응(ms)
  times: number[];  // 라운드별 반응(ms)
  timeLimitSec: number;
  initialGrid: number;
  startedAt: number; // epoch ms (Date.now())
  endedAt: number;   // epoch ms (Date.now())
};

const CLIENT_ID_KEY = 'reaction_game_client_id';

function debugEnabled(): boolean {
  try {
    if (process.env.NODE_ENV !== 'production') return true;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('debugSupabase') === '1') return true;
    if (localStorage.getItem('debug_supabase') === '1') return true;
  } catch {}
  return false;
}

function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const id =
      (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return 'anon';
  }
}

export async function logSessionStart(payload: StartPayload) {
  if (!supabase || typeof window === 'undefined') return;
  const clientId = getClientId();
  const ua = navigator.userAgent;
  const path = location.pathname;

  const { error } = await supabase.rpc('log_reaction_start', {
    session_id: payload.sessionId,
    client_id: clientId,
    difficulty: payload.difficulty,
    time_limit_sec: payload.timeLimitSec,
    initial_grid: payload.initialGrid,
    user_agent: ua,
    path,
  });

  if (error && debugEnabled()) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] log_reaction_start failed', {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: error.code,
    });
  }
}

export async function logSessionEnd(payload: EndPayload) {
  if (!supabase || typeof window === 'undefined') return;
  const clientId = getClientId();
  const ua = navigator.userAgent;
  const path = location.pathname;

  const { error } = await supabase.rpc('log_reaction_end', {
    session_id: payload.sessionId,
    client_id: clientId,
    difficulty: payload.difficulty,
    rounds: payload.rounds ?? 0,
    avg_ms: Math.round(payload.avgMs ?? 0),
    hits: payload.times?.length ?? 0,
    times_ms: payload.times ?? [],
    time_limit_sec: payload.timeLimitSec,
    initial_grid: payload.initialGrid,
    started_at_ms: Math.round(payload.startedAt ?? Date.now()),
    ended_at_ms: Math.round(payload.endedAt ?? Date.now()),
    user_agent: ua,
    path,
  });

  if (error && debugEnabled()) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] log_reaction_end failed', {
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      code: error.code,
    });
  }
}
