import { replay, RULESET, MAX_TICKS, type Handling, type ReplayEvent } from '../_shared/tetris-engine.ts'

// Minimal runtime surface keeps this function type-checkable without a Deno install.
declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void }
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const db = async (path: string, body?: unknown) => {
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Server is not configured')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Database request failed')
  return response.json()
}
async function playerHash(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('')
}
async function readBounded(request: Request): Promise<string> {
  if (!request.body) throw new Error('Empty request')
  const reader = request.body.getReader(), decoder = new TextDecoder()
  let size = 0, text = ''
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.byteLength
    if (size > 2000000) { await reader.cancel(); throw new Error('Request too large') }
    text += decoder.decode(value, {stream:true})
  }
  return text + decoder.decode()
}
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null,{headers:cors})
  if (request.method !== 'POST') return json({error:'Method not allowed'},405)
  try {
    const body = JSON.parse(await readBounded(request))
    if (!body || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token) || body.ruleset !== RULESET) return json({error:'게임을 새로고침한 뒤 다시 시작해 주세요.'},400)
    const hash = await playerHash(body.token)
    if (body.action === 'top') return json(await db('rpc/tetris_board',{p_player_hash:hash}))
    if (body.action === 'start') {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1
      return json(await db('rpc/tetris_start',{p_player_hash:hash,p_seed:seed}))
    }
    if (body.action !== 'submit') return json({error:'Unknown action'},400)
    if (typeof body.runId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.runId)) return json({error:'잘못된 게임 기록입니다.'},400)
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim().normalize('NFC') : ''
    if (nickname.length < 2 || nickname.length > 16 || /[\p{Cc}\p{Cf}<>]/u.test(nickname)) return json({error:'닉네임을 2~16자의 일반 문자로 입력해 주세요.'},400)
    if (!['keyboard','touch'].includes(body.input)) return json({error:'Invalid input method'},400)
    const runs = await db(`tetris_runs?id=eq.${body.runId}&player_hash=eq.${hash}&select=id,seed,ruleset,created_at,submitted_at`)
    const run = runs[0]
    if (!run || run.ruleset !== RULESET) return json({error:'시작 기록을 찾지 못했습니다.'},400)
    if (run.submitted_at) return json(await db('rpc/tetris_board',{p_player_hash:hash}))
    const elapsed = Date.now()-Date.parse(run.created_at)
    if (elapsed > 86400000) return json({error:'등록 기한(24시간)이 지난 기록입니다.'},400)
    if (!Number.isInteger(body.ticks) || body.ticks < 1 || body.ticks > MAX_TICKS || body.ticks / 60 * 1000 > elapsed + 2000) return json({error:'플레이 시간을 확인할 수 없습니다.'},400)
    let verified
    try { verified = replay(Number(run.seed),body.events as ReplayEvent[],body.ticks,body.handling as Handling) }
    catch { return json({error:'입력 기록 검증에 실패했습니다.'},400) }
    return json(await db('rpc/tetris_commit',{
      p_run_id:run.id,p_player_hash:hash,p_nickname:nickname,p_score:verified.score,
      p_lines:verified.lines,p_level:verified.level,p_ticks:verified.tick,p_input:body.input,
    }))
  } catch {
    return json({error:'순위 서버를 사용할 수 없습니다. 기록을 보관하고 잠시 후 다시 등록해 주세요.'},503)
  }
})
