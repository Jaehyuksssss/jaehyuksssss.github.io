import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, cells, fits, ghost, move, rotate, step, replay, KEY, KINDS, HEIGHT, MAX_TICKS, DEFAULT_HANDLING } from '../supabase/functions/_shared/tetris-engine.ts'

test('seeded bags include every piece once and produce reproducible sequences',()=>{
  const a=createGame(1234), b=createGame(1234)
  assert.deepEqual(a,b)
  assert.deepEqual(new Set([a.active.kind,...a.queue.slice(0,6)]),new Set(KINDS))
  assert.notDeepEqual(a.queue,createGame(4321).queue)
  assert.deepEqual(new Set(createGame(0).queue.slice(-7)),new Set(KINDS))
})
test('ghost is the lowest valid location without mutating the current piece',()=>{
  const s=createGame(4), before={...s.active}, landing=ghost(s)
  assert.ok(fits(s,landing));assert.equal(fits(s,{...landing,y:landing.y+1}),false)
  assert.deepEqual(s.active,before)
})
test('four rotations restore each shape; wall kicks keep an I inside the left wall',()=>{
  for(const kind of KINDS.filter(k=>k!=='O')){
    const s=createGame(1);s.active={kind,x:3,y:5,rotation:0}
    const before=cells(s.active)
    for(let i=0;i<4;i++)assert.ok(rotate(s,1))
    assert.deepEqual(cells(s.active),before)
  }
  const s=createGame(1);s.active={kind:'I',x:-2,y:5,rotation:1}
  assert.ok(fits(s,s.active));assert.ok(rotate(s,-1));assert.ok(fits(s,s.active));assert.equal(s.active.x,0)
})
test('holding hard drop locks exactly one piece until the key is released',()=>{
  const s=createGame(1)
  step(s,KEY.drop)
  for(let i=0;i<10;i++)step(s,KEY.drop)
  assert.equal(s.pieces,1)
  step(s,0);step(s,KEY.drop);assert.equal(s.pieces,2)
})
test('hold is available once per piece and resets after locking',()=>{
  const s=createGame(100), first=s.active.kind
  step(s,KEY.hold);const second=s.active.kind
  assert.equal(s.hold,first);assert.ok(s.held)
  step(s,0);step(s,KEY.hold);assert.equal(s.active.kind,second)
  step(s,KEY.drop);assert.equal(s.held,false)
  step(s,0);step(s,KEY.hold);assert.equal(s.active.kind,first)
})
test('one tap moves one cell, key repeat obeys DAS/ARR and opposing directions cancel',()=>{
  const s=createGame(5), x=s.active.x
  step(s,KEY.left);assert.equal(s.active.x,x-1)
  for(let i=0;i<9;i++)step(s,KEY.left)
  assert.equal(s.active.x,x-1)
  step(s,KEY.left);assert.equal(s.active.x,x-2)
  const current=s.active.x;step(s,KEY.left|KEY.right);assert.equal(s.active.x,current)
})
test('lock delay allows placement, but reset count is capped',()=>{
  const s=createGame(2);s.active={kind:'O',x:4,y:HEIGHT-2,rotation:0}
  for(let i=0;i<29;i++)step(s,0)
  assert.equal(s.pieces,0);step(s,0);assert.equal(s.pieces,1)
  const t=createGame(2);t.active={kind:'O',x:4,y:HEIGHT-2,rotation:0}
  for(let i=0;i<15;i++){t.lock=20;move(t,i%2?1:-1);assert.equal(t.lock,0)}
  t.lock=20;move(t,1);assert.equal(t.resets,15);assert.equal(t.lock,20)
})
test('four-line clear gives 800 points, advances level, and preserves board dimensions',()=>{
  const s=createGame(2);s.lines=6
  for(let y=HEIGHT-4;y<HEIGHT;y++)s.board[y]=Array.from({length:10},(_,x)=>x===5?0:2)
  s.active={kind:'I',x:3,y:HEIGHT-4,rotation:1}
  step(s,KEY.drop)
  assert.equal(s.score,800);assert.equal(s.lines,10);assert.equal(s.level,2)
  assert.equal(s.board.length,HEIGHT);assert.ok(s.board.every(r=>r.length===10));assert.ok(s.backToBack)
})
test('back-to-back bonus and combo are computed from cleared lines',()=>{
  const s=createGame(2);s.backToBack=true;s.combo=0
  for(let y=HEIGHT-4;y<HEIGHT;y++)s.board[y]=Array.from({length:10},(_,x)=>x===5?0:2)
  s.active={kind:'I',x:3,y:HEIGHT-4,rotation:1};step(s,KEY.drop)
  assert.equal(s.score,1250);assert.equal(s.combo,1)
})
test('a complete input replay produces identical state and rejects tampered metadata',()=>{
  const s=createGame(99),events=[]
  for(let i=0;!s.over&&i<1000;i++){const mask=i%2?0:KEY.drop;events.push([i,mask]);step(s,mask)}
  assert.ok(s.over);assert.deepEqual(replay(99,events,s.tick,DEFAULT_HANDLING),s)
  assert.throws(()=>replay(99,events,s.tick,{...DEFAULT_HANDLING,arr:0}))
  assert.throws(()=>replay(99,[[0,128]],s.tick,DEFAULT_HANDLING))
  assert.throws(()=>replay(99,[[0,0],[0,1]],s.tick,DEFAULT_HANDLING))
  assert.throws(()=>replay(99,events,s.tick+1,DEFAULT_HANDLING),/after game over/)
  assert.throws(()=>replay(99,[],1,DEFAULT_HANDLING),/Unfinished/)
})
test('two-hour session limit also applies to a hard drop on the final tick',()=>{
  const s=createGame(9);s.tick=MAX_TICKS-1;step(s,KEY.drop)
  assert.ok(s.over);assert.equal(s.tick,MAX_TICKS)
})

test('Edge endpoint recomputes scores, binds runs to players, and rejects bad submissions',async()=>{
  let handler,commit,requestedRun
  const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno
  globalThis.Deno={env:{get:name=>name==='SUPABASE_URL'?'https://test.invalid':'server-secret'},serve:fn=>{handler=fn}}
  globalThis.fetch=async(url,options)=>{
    if(String(url).includes('tetris_runs?')){
      requestedRun=String(url)
      return new Response(JSON.stringify([{id:'12345678-1234-1234-1234-123456789abc',seed:99,ruleset:'marathon-v1',created_at:new Date(Date.now()-60000).toISOString(),submitted_at:null}]))
    }
    if(String(url).endsWith('rpc/tetris_commit')){commit=JSON.parse(options.body);return new Response(JSON.stringify({top:[],me:null,next_score:null}))}
    throw new Error('Unexpected request')
  }
  try{
    await import('../supabase/functions/tetris/index.ts')
    const state=createGame(99),events=[]
    for(let tick=0;!state.over;tick++){const mask=tick%2?0:KEY.drop;events.push([tick,mask]);step(state,mask)}
    const body={action:'submit',token:'a'.repeat(64),ruleset:'marathon-v1',runId:'12345678-1234-1234-1234-123456789abc',nickname:'tester',input:'keyboard',handling:DEFAULT_HANDLING,events,ticks:state.tick,score:99999999}
    const send=value=>handler(new Request('https://edge.invalid',{method:'POST',body:JSON.stringify(value)}))
    const response=await send(body);assert.equal(response.status,200)
    assert.equal(commit.p_score,state.score);assert.notEqual(commit.p_score,body.score)
    assert.match(requestedRun,/player_hash=eq\.[a-f0-9]{64}/);assert.notEqual(commit.p_player_hash,body.token)
    assert.equal((await send({...body,token:'bad'})).status,400)
    assert.equal((await send({...body,events:[[0,200]]})).status,400)
    assert.equal((await send({...body,nickname:'<x>'})).status,400)
    assert.equal((await handler(new Request('https://edge.invalid',{method:'GET'}))).status,405)
  }finally{globalThis.fetch=originalFetch;globalThis.Deno=originalDeno}
})
