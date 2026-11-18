import { useCallback, useEffect, useRef, useState } from 'react'
import { cells, createGame, DEFAULT_HANDLING, ghost, HIDDEN, HZ, KEY, KINDS, step, validHandling, type Handling, type Kind, type ReplayEvent, type State } from '../../../supabase/functions/_shared/tetris-engine'
import { loadLeaderboard, onlineAvailable, startRankedRun, submitRun, type Board, type PendingScore, type Run } from '../../lib/tetrisApi'
import './tetris.css'
import { TetrisInput } from '../../lib/tetrisInput'

type Mode = 'ready' | 'countdown' | 'playing' | 'paused' | 'over'
type Action = keyof typeof KEY
const COLORS = ['#66d9ef','#f7d66d','#b79afa','#88d7a5','#fa8a9a','#7da7f7','#f7b27a']
const DEFAULT_KEYS: Record<Action,string> = { left:'ArrowLeft', right:'ArrowRight', down:'ArrowDown', cw:'ArrowUp', ccw:'KeyZ', drop:'Space', hold:'KeyC' }
const LABELS: Record<Action,string> = { left:'왼쪽',right:'오른쪽',down:'빠른 낙하',cw:'오른쪽 회전',ccw:'왼쪽 회전',drop:'즉시 낙하',hold:'보관' }
const prettyKey = (key: string) => ({ ArrowLeft:'←',ArrowRight:'→',ArrowDown:'↓',ArrowUp:'↑',Space:'Space' }[key] || key.replace('Key','').replace('Digit',''))
const number = (n: number) => n.toLocaleString('ko-KR')
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }
function write(key: string, data: unknown): boolean { try { localStorage.setItem(key,JSON.stringify(data)); return true } catch { return false } }
function draw(canvas: HTMLCanvasElement | null, state: State, dim = false) {
  if (!canvas) return
  const ctx = canvas.getContext('2d'); if (!ctx) return
  const ratio = Math.min(window.devicePixelRatio || 1,2)
  if (canvas.width !== 300 * ratio) { canvas.width = 300 * ratio; canvas.height = 600 * ratio }
  ctx.setTransform(ratio,0,0,ratio,0,0)
  ctx.fillStyle = '#101c22'; ctx.fillRect(0,0,300,600)
  ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1
  for (let x = 0; x <= 10; x++) { ctx.beginPath(); ctx.moveTo(x*30,0); ctx.lineTo(x*30,600); ctx.stroke() }
  for (let y = 0; y <= 20; y++) { ctx.beginPath(); ctx.moveTo(0,y*30); ctx.lineTo(300,y*30); ctx.stroke() }
  const block = (x: number,y: number,color: string, outline = false) => {
    y -= HIDDEN; if (y < 0) return
    if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x*30+4,y*30+4,22,22); return }
    ctx.fillStyle = color; ctx.fillRect(x*30+1.5,y*30+1.5,27,27)
    ctx.fillStyle = '#ffffff35'; ctx.fillRect(x*30+3,y*30+3,24,3)
    ctx.fillStyle = '#00000018'; ctx.fillRect(x*30+3,y*30+25,24,2)
  }
  state.board.forEach((row,y) => row.forEach((v,x) => { if (v) block(x,y,COLORS[v-1]) }))
  if (!dim && !state.over) {
    const color = COLORS[KINDS.indexOf(state.active.kind)]
    cells(ghost(state)).forEach(([x,y]) => block(x,y,color+'88',true))
    cells(state.active).forEach(([x,y]) => block(x,y,color))
  }
  if (state.tick - state.clearTick < 10) {
    ctx.fillStyle = `rgba(255,255,255,${(10 - state.tick + state.clearTick)/30})`
    state.clearRows.forEach(y => ctx.fillRect(0,(y-HIDDEN)*30,300,30))
  }
}
function Mini({ kind, muted = false }: { kind: Kind | null; muted?: boolean }) {
  const points = kind ? cells({ kind,rotation:0,x:0,y:0 }) : []
  const minX = Math.min(...points.map(p=>p[0]),0), width = kind === 'I' ? 4 : kind === 'O' ? 2 : 3
  return <svg className={'tt-mini'+(muted?' muted':'')} viewBox="0 0 100 50" role="img" aria-label={kind ? `${kind} 블록` : '비어 있음'}>
    {points.map(([x,y],i)=><rect key={i} x={(100-width*20)/2+(x-minX)*20} y={kind==='I'?15:y*20+5} width="18" height="18" rx="2" fill={COLORS[KINDS.indexOf(kind!)]} />)}
    {!kind && <text x="50" y="30" textAnchor="middle" fill="#647a85" fontSize="20">—</text>}
  </svg>
}
function HandlingPreview({ handling }: { handling: Handling }) {
  const [x,setX] = useState(4), pressed = useRef(0), ticks = useRef(0)
  useEffect(()=>{
    const timer = setInterval(()=>{
      if (!pressed.current) return
      ticks.current++
      if (ticks.current===1 || (ticks.current>handling.das && (ticks.current-handling.das-1)%handling.arr===0)) setX(v=>Math.max(0,Math.min(8,v+pressed.current)))
    },1000/HZ)
    return ()=>clearInterval(timer)
  },[handling])
  return <div className="tt-handling-preview">
    <div className="tt-test-track"><span style={{left:`${x*10}%`}}>▣</span></div>
    <div>{[-1,1].map(direction=><button key={direction} type="button" aria-label={direction<0?'왼쪽 이동 테스트':'오른쪽 이동 테스트'}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pressed.current=direction;ticks.current=0}}
      onPointerUp={()=>{pressed.current=0}} onPointerCancel={()=>{pressed.current=0}} onLostPointerCapture={()=>{pressed.current=0}}
      onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){pressed.current=direction;ticks.current=0}}}
      onKeyUp={()=>{pressed.current=0}} onBlur={()=>{pressed.current=0}}>{direction<0?'← 누르고 테스트':'누르고 테스트 →'}</button>)}</div>
  </div>
}

export default function Tetris() {
  const [mode,setMode] = useState<Mode>('ready'), modeRef = useRef<Mode>('ready')
  const game = useRef(createGame(1)), canvas = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLDivElement>(null)
  const [stats,setStats] = useState({score:0,lines:0,level:1,hold:null as Kind|null,held:false,next:[] as Kind[],message:''})
  const [best,setBest] = useState(0), [count,setCount] = useState(3), [starting,setStarting] = useState(false)
  const [settings,setSettings] = useState(false), [handling,setHandling] = useState<Handling>(DEFAULT_HANDLING)
  const handlingRef = useRef(DEFAULT_HANDLING), runHandling = useRef(DEFAULT_HANDLING)
  const [keys,setKeys] = useState(DEFAULT_KEYS), keysRef = useRef(DEFAULT_KEYS), [binding,setBinding] = useState<Action|null>(null)
  const [sound,setSound] = useState(false), soundRef = useRef(false), audio = useRef<AudioContext|null>(null)
  const [status,setStatus] = useState(''), [ranked,setRanked] = useState(false)
  const run = useRef<Run|null>(null), replay = useRef<ReplayEvent[]>([]), lastMask = useRef(0)
  const input = useRef(new TetrisInput()), inputMethod = useRef('keyboard')
  const [ready,setReady] = useState(false)
  const [board,setBoard] = useState<Board|null>(null), [boardError,setBoardError] = useState(onlineAvailable ? '' : '온라인 리더보드가 연결되지 않았습니다. 개인 모드로 플레이할 수 있습니다.'), [loadingBoard,setLoadingBoard] = useState(false)
  const [nickname,setNickname] = useState(''), [pending,setPending] = useState<PendingScore[]>([]), pendingRef = useRef<PendingScore[]>([])
  const [saving,setSaving] = useState(false), [saveStatus,setSaveStatus] = useState('')
  const changeMode = useCallback((next: Mode)=>{modeRef.current=next;setMode(next)},[])
  const clearInput = useCallback(()=>{input.current.clear()},[])
  const refresh = useCallback(async()=>{
    if (!onlineAvailable) {setBoardError('온라인 리더보드가 연결되지 않았습니다. 개인 모드로 플레이할 수 있습니다.');return}
    setLoadingBoard(true);setBoardError('')
    try { setBoard(await loadLeaderboard()) } catch (error) { setBoardError(error instanceof Error ? error.message : '순위를 불러오지 못했습니다. 개인 모드로 플레이할 수 있습니다.') }
    finally {setLoadingBoard(false)}
  },[])
  useEffect(()=>{
    setReady(true)
    const h = read<Handling>('tetris-handling-v1',DEFAULT_HANDLING)
    if (validHandling(h)) {setHandling(h);handlingRef.current=h}
    const k = read<Record<Action,string>>('tetris-keys-v1',DEFAULT_KEYS)
    if (Object.keys(DEFAULT_KEYS).every(a=>typeof k[a as Action]==='string') && new Set(Object.values(k)).size===7) {setKeys(k);keysRef.current=k}
    setBest(read<number>('tetris-best-v1',0));setNickname(read<string>('tetris-name-v1',''))
    const saved = read<PendingScore[]>('tetris-pending-v1',[])
    if (Array.isArray(saved)) {pendingRef.current=saved.filter(p=>p?.run?.id && p.created>Date.now()-86400000);setPending(pendingRef.current)}
    const s = read<boolean>('tetris-sound-v1',false);setSound(s);soundRef.current=s
    draw(canvas.current,game.current,true);void refresh()
    return ()=>{void audio.current?.close()}
  },[refresh])
  const pause = useCallback(()=>{
    clearInput()
    if (modeRef.current==='playing'||modeRef.current==='countdown') changeMode('paused')
  },[changeMode,clearInput])
  useEffect(()=>{
    const down = (e: KeyboardEvent)=>{
      if ((e.target as HTMLElement)?.closest('input,select,textarea,button')) return
      if (e.code==='Escape' && modeRef.current==='playing') { e.preventDefault();pause();return }
      if (modeRef.current!=='playing'||!Object.values(keysRef.current).includes(e.code)) return
      e.preventDefault()
      const action = (Object.keys(KEY) as Action[]).find(a=>keysRef.current[a]===e.code)
      if(action)input.current.press('key:'+e.code,KEY[action])
    }
    const up = (e: KeyboardEvent)=>{input.current.release('key:'+e.code)}
    const visibility = ()=>{if(document.hidden)pause()}
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',pause)
    document.addEventListener('visibilitychange',visibility)
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility)}
  },[pause])
  useEffect(()=>{
    if(mode!=='countdown')return
    const timer=setTimeout(()=>{if(count>1)setCount(count-1);else{clearInput();changeMode('playing');stage.current?.focus({preventScroll:true})}},650)
    return ()=>clearTimeout(timer)
  },[mode,count,changeMode,clearInput])
  const beep = useCallback((clear: boolean)=>{
    if(!soundRef.current||!audio.current)return
    const ctx=audio.current, osc=ctx.createOscillator(), gain=ctx.createGain()
    osc.type='sine';osc.frequency.setValueAtTime(clear?620:180,ctx.currentTime)
    gain.gain.setValueAtTime(0.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08)
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.09)
  },[])
  useEffect(()=>{
    let frame=0,last=0,accumulator=0,lastUI=0
    const render=(now: number)=>{
      if(modeRef.current==='playing'){
        const elapsed=last?now-last:0
        if(elapsed>500){pause();accumulator=0}
        else accumulator+=elapsed
        while(accumulator>=1000/HZ&&modeRef.current==='playing'){
          const mask=input.current.sample()
          const s=game.current
          if(mask!==lastMask.current){replay.current.push([s.tick,mask]);lastMask.current=mask}
          const pieces=s.pieces,lines=s.lines
          step(s,mask,runHandling.current);accumulator-=1000/HZ
          if(s.pieces!==pieces)beep(s.lines!==lines)
          if(s.over){
            changeMode('over');clearInput()
            setBest(previous=>{const next=Math.max(previous,s.score);write('tetris-best-v1',next);return next})
            if(run.current){
              const result: PendingScore={run:run.current,ticks:s.tick,events:replay.current,handling:{...runHandling.current},score:s.score,input:inputMethod.current,created:Date.now()}
              const next=[...pendingRef.current,result];pendingRef.current=next;setPending(next)
              if(!write('tetris-pending-v1',next))setSaveStatus('기기에 기록을 보관하지 못했습니다. 페이지를 닫기 전에 등록해 주세요.')
            }
            void refresh()
          }
        }
      }else accumulator=0
      const s=game.current
      draw(canvas.current,s,modeRef.current==='ready'||modeRef.current==='paused')
      if(now-lastUI>80){setStats({score:s.score,lines:s.lines,level:s.level,hold:s.hold,held:s.held,next:s.queue.slice(0,5),message:s.tick-s.clearTick<90?s.message:''});lastUI=now}
      last=now;frame=requestAnimationFrame(render)
    }
    frame=requestAnimationFrame(render);return()=>cancelAnimationFrame(frame)
  },[beep,changeMode,clearInput,pause,refresh])
  const start=async()=>{
    if(starting)return
    setStarting(true);setStatus('');setSettings(false);setBinding(null);clearInput()
    if(soundRef.current){try{audio.current??=new AudioContext();await audio.current.resume()}catch{}}
    let current: Run|null=null
    if(onlineAvailable){try{current=await startRankedRun()}catch{setStatus('순위 서버에 연결하지 못해 이번 판은 기기 기록으로 남깁니다.')}}
    else setStatus('이번 판은 이 기기에 기록됩니다.')
    run.current=current;setRanked(!!current)
    game.current=createGame(current?.seed??crypto.getRandomValues(new Uint32Array(1))[0])
    replay.current=[];lastMask.current=0;runHandling.current={...handlingRef.current};inputMethod.current='keyboard'
    setCount(3);changeMode('countdown');setStarting(false);stage.current?.focus({preventScroll:true})
    if(window.matchMedia('(max-width: 600px)').matches)stage.current?.scrollIntoView({block:'start',behavior:'instant'})
  }
  const resume=()=>{setSettings(false);setBinding(null);setCount(3);clearInput();changeMode('countdown')}
  const updateHandling=(key:keyof Handling,value:number)=>{
    const next={...handling,[key]:value};setHandling(next);handlingRef.current=next;write('tetris-handling-v1',next)
  }
  const save=async()=>{
    if(saving||!pendingRef.current.length)return
    if(nickname.trim().length<2||nickname.trim().length>16){setSaveStatus('닉네임을 2~16자로 입력해 주세요.');return}
    setSaving(true);setSaveStatus('기록을 검증하고 있습니다…');write('tetris-name-v1',nickname.trim())
    try{
      const item=pendingRef.current[0],result=await submitRun(item,nickname.trim());setBoard(result)
      const next=pendingRef.current.filter(p=>p.run.id!==item.run.id);pendingRef.current=next;setPending(next);write('tetris-pending-v1',next)
      setSaveStatus('검증 완료. 개인 최고 기록이 순위에 반영되었습니다.');setBoardError('')
    }catch(e){setSaveStatus(e instanceof Error?e.message:'저장에 실패했습니다. 기록은 보관되어 있으니 다시 등록해 주세요.')}
    finally{setSaving(false)}
  }
  const touch=(action:Action,label:string,extra='')=><button type="button" className={'tt-touch '+extra} aria-label={LABELS[action]} disabled={mode!=='playing'}
    onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current.press('pointer:'+e.pointerId,KEY[action]);inputMethod.current='touch'}}
    onPointerUp={e=>input.current.release('pointer:'+e.pointerId)} onPointerCancel={e=>input.current.release('pointer:'+e.pointerId)} onLostPointerCapture={e=>input.current.release('pointer:'+e.pointerId)}
    onClick={e=>{if(e.detail===0&&modeRef.current==='playing')input.current.tap(KEY[action])}}>{label}</button>

  return <section className="tt-app" aria-label="테트리스" data-game-ready={ready}>
    <header className="tt-heading"><div><h1>테트리스</h1><p>블록을 쌓아 빈틈없이 한 줄을 채우세요.</p></div><span className="tt-mode-tag">마라톤</span></header>
    <div className="tt-layout"><div className="tt-play-column">
      <div className="tt-toolbar"><span><i className={ranked?'online':''}/>{ranked?'온라인 모드':'개인 모드'} <small>· 최고 {number(best)}</small></span><div>
        <button type="button" aria-pressed={sound} onClick={()=>{const next=!sound;setSound(next);soundRef.current=next;write('tetris-sound-v1',next);if(next){try{audio.current??=new AudioContext();void audio.current.resume()}catch{}}}}>{sound?'소리 켜짐':'소리 꺼짐'}</button>
        <button type="button" onClick={()=>{pause();setSettings(v=>!v);setBinding(null)}} aria-expanded={settings}>설정</button>
        <button type="button" onClick={mode==='paused'?resume:pause} disabled={!['playing','paused','countdown'].includes(mode)}>{mode==='paused'?'계속':'일시정지'}</button>
      </div></div>
      <div className="tt-stage" ref={stage} tabIndex={0} aria-label="게임 영역. 방향키 이동, 위쪽 회전, Space 즉시 낙하, C 보관, Escape 일시정지.">
        <aside className="tt-hold"><h2>보관 <kbd>{prettyKey(keys.hold)}</kbd></h2><Mini kind={stats.hold} muted={stats.held}/><div className="tt-stats"><span>점수</span><strong>{number(stats.score)}</strong><span>레벨</span><b>{String(stats.level).padStart(2,'0')}</b><span>지운 줄</span><b>{stats.lines}</b></div><div className="tt-level-track"><span style={{height:`${(stats.lines%10)*10}%`}}/></div></aside>
        <div className="tt-board-wrap"><canvas ref={canvas} width="300" height="600" aria-label={`점수 ${stats.score}, 레벨 ${stats.level}, 지운 줄 ${stats.lines}`}/>
          {stats.message&&mode==='playing'&&<div className="tt-clear-message" key={stats.lines}>{stats.message}</div>}
          {mode!=='playing'&&<div className={'tt-overlay '+(mode==='countdown'?'counting':'')}>
            {mode==='ready'&&<><span className="tt-overlay-icon">▦</span><h2>테트리스</h2><p>10줄을 지울 때마다<br/>레벨과 낙하 속도가 올라갑니다.</p><button className="tt-primary" onClick={()=>void start()} disabled={starting||!ready}>{!ready?'게임 불러오는 중…':starting?'준비 중…':'게임 시작'}</button><small className="tt-start-key-help">← → 이동 · ↑ 회전 · Space 낙하</small><small className="tt-start-touch-help">아래 버튼으로 이동하고 회전하세요.</small></>}
            {mode==='countdown'&&<><strong className="tt-count" key={count}>{count}</strong><p>곧 시작합니다</p></>}
            {mode==='paused'&&<><h2>일시정지</h2><p>계속하기를 누르면 이어서 진행합니다.</p><button className="tt-primary" onClick={resume}>계속하기</button></>}
            {mode==='over'&&<><span className="tt-eyebrow">게임 종료</span><h2>{number(stats.score)}</h2><p>지운 줄 {stats.lines} · 레벨 {stats.level}<br/>{stats.score>=best&&stats.score>0?'최고 기록을 갱신했습니다.':`개인 최고 ${number(best)}점`}</p><button className="tt-primary" onClick={()=>void start()} disabled={starting}>{starting?'준비 중…':'다시 하기'}</button><small>{ranked?'리더보드에 기록을 등록할 수 있습니다.':'이 기기에 최고 기록을 저장했습니다.'}</small></>}
          </div>}
        </div>
        <aside className="tt-next"><h2>다음 <span>5</span></h2>{(stats.next.length?stats.next:['T','I','L','S','O'] as Kind[]).map((kind,i)=><Mini key={i} kind={kind}/>)}</aside>
      </div>
      <div className="tt-mobile-controls"><div className="tt-move-pad">{touch('left','←')}{touch('down','↓')}{touch('right','→')}</div><div className="tt-rotate-pad">{touch('ccw','↶')}{touch('cw','↷')}{touch('hold','보관','hold')}{touch('drop','즉시 낙하','drop')}</div></div>
      <p className="tt-key-help"><kbd>{prettyKey(keys.left)}</kbd><kbd>{prettyKey(keys.right)}</kbd> 이동 <kbd>{prettyKey(keys.cw)}</kbd> 회전 <kbd>{prettyKey(keys.drop)}</kbd> 낙하 <kbd>{prettyKey(keys.hold)}</kbd> 보관</p>
      {status&&<p className="tt-status" role="status">{status}</p>}
      {settings&&<section className="tt-settings" aria-label="게임 설정"><div className="tt-section-heading"><h2>조작 설정</h2><button onClick={()=>{setSettings(false);setBinding(null)}}>닫기</button></div>
        <p>속도 변경은 다음 판부터 적용됩니다. 아래 버튼을 눌러 이동 반응을 시험해 보세요.</p>
        {(['das','arr','soft'] as const).map((key,i)=><label className="tt-range" key={key}><span>{['연속 이동 시작 시간','연속 이동 간격','빠른 낙하 간격'][i]}<b>{Math.round(handling[key]*1000/HZ)} ms</b></span><input type="range" min={key==='das'?5:1} max={key==='das'?18:6} value={handling[key]} onChange={e=>updateHandling(key,Number(e.target.value))}/></label>)}
        <HandlingPreview handling={handling}/><div className="tt-bindings">{(Object.keys(KEY) as Action[]).map(action=><button type="button" key={action} onClick={()=>setBinding(action)} onKeyDown={e=>{
          if(binding!==action)return;e.preventDefault();e.stopPropagation()
          if(e.code==='Escape'){setBinding(null);return}
          if(['Tab','Enter','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code)||e.ctrlKey||e.altKey||e.metaKey)return
          if((Object.keys(keys) as Action[]).some(a=>a!==action&&keys[a]===e.code))return
          const next={...keys,[action]:e.code};setKeys(next);keysRef.current=next;write('tetris-keys-v1',next);setBinding(null);clearInput()
        }}><span>{LABELS[action]}</span><kbd>{binding===action?'키 입력…':prettyKey(keys[action])}</kbd></button>)}</div>
        <p>버튼을 선택한 뒤 원하는 키를 누르세요. 중복 키는 사용할 수 없습니다. Esc로 취소합니다.</p>
        <button className="tt-text-button" onClick={()=>{setHandling(DEFAULT_HANDLING);handlingRef.current=DEFAULT_HANDLING;setKeys(DEFAULT_KEYS);keysRef.current=DEFAULT_KEYS;write('tetris-handling-v1',DEFAULT_HANDLING);write('tetris-keys-v1',DEFAULT_KEYS);setBinding(null)}}>기본 설정으로 복원</button>
      </section>}
    </div>
    <aside className="tt-sidebar"><section className="tt-leaderboard"><div className="tt-section-heading"><div><h2>리더보드</h2></div><button type="button" onClick={()=>void refresh()} disabled={loadingBoard} aria-label="순위 새로고침">↻</button></div><p className="tt-board-caption">전체 순위 · 플레이어별 최고 점수</p>
      {boardError?<div className="tt-empty"><span>↗</span><p>{boardError}</p><button onClick={()=>void refresh()} disabled={loadingBoard}>다시 불러오기</button></div>:!board?<p className="tt-empty">순위를 불러오는 중…</p>:board.top.length===0?<div className="tt-empty"><span>01</span><p>아직 등록된 기록이 없습니다.</p></div>:<ol>{board.top.map(row=><li key={row.rank} className={row.own?'own':''}><span className="tt-rank">{String(row.rank).padStart(2,'0')}</span><div><b>{row.nickname}{row.own&&<small> 나</small>}</b><span>레벨 {row.level} · {row.lines}줄</span></div><strong>{number(row.score)}</strong></li>)}</ol>}
      {board?.me&&<div className="tt-my-rank"><span>내 최고 순위 <b>#{board.me.rank}</b></span><strong>{number(board.me.score)}</strong>{board.next_score!==null&&<small>한 단계 위까지 {number(board.next_score-board.me.score+1)}점</small>}</div>}
      <p className="tt-rank-note">같은 점수는 먼저 등록된 기록이 앞섭니다.<br/>이 브라우저의 플레이어 기록으로 등록됩니다.</p>
    </section>
    {pending.length>0&&<section className="tt-submit"><h2>기록 등록</h2><p>등록할 기록 {pending.length}개 · {number(pending[0].score)}점</p><label htmlFor="tt-nickname">공개 닉네임</label><input id="tt-nickname" maxLength={16} minLength={2} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="2~16자" autoComplete="nickname"/><button className="tt-primary" disabled={saving} onClick={()=>void save()}>{saving?'검증 중…':'리더보드에 등록'}</button><small>게임 종료 후 24시간 안에 등록할 수 있습니다.<br/>기록 등록 중에도 다시 플레이할 수 있습니다.</small></section>}
    {saveStatus&&<p className="tt-status" role="status">{saveStatus}</p>}
    <details className="tt-rules"><summary>플레이 가이드 & 점수 규칙</summary><p>10줄마다 레벨이 오르고 블록이 빨라집니다. HOLD는 블록을 고정할 때마다 한 번 사용할 수 있습니다.</p><p>한 번에 1 / 2 / 3 / 4줄을 지우면 100 / 300 / 500 / 800점 × 현재 레벨. 연속 줄 삭제는 콤보 점수가 추가됩니다.</p><p>T-SPIN은 마지막 회전 후 T 블록 중심의 대각선 세 곳 이상이 막힌 경우입니다. 0 / 1 / 2 / 3줄은 400 / 800 / 1,200 / 1,600점 × 레벨. 미니 판정은 별도로 두지 않습니다.</p><p>TETRIS 또는 T-SPIN 줄 삭제를 이어가면 기본 점수 1.5배. 소프트 드롭은 한 칸 1점, 하드 드롭은 한 칸 2점입니다.</p><p>바닥에 닿은 뒤 0.5초 동안 배치를 조정할 수 있고, 이동·회전으로 고정 시간을 초기화하는 횟수는 블록당 15번입니다. 한 판의 최대 플레이 시간은 2시간입니다.</p><p>순위는 서버가 입력 기록을 재생해 확인한 점수만 반영합니다. 브라우저 저장 공간을 지우거나 다른 기기를 사용하면 별도 플레이어로 기록됩니다.</p></details>
    </aside></div>
  </section>
}
