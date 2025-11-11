import React from "react"
import styled from "@emotion/styled"
import { submitBallSliceScore } from "lib/ballSliceApi"

type Phase = "idle" | "running" | "over"

const Wrapper = styled.div`
  display: grid;
  gap: 12px;
  place-items: center;
  padding: 12px 0 24px;
`

const Panel = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  font-weight: 800;
`

const Stat = styled.span`
  color: #1f2937;
  background: #fff3bf;
  padding: 2px 8px;
  border-radius: 8px;
`

const PrimaryBtn = styled.button`
  border: none;
  background: #60a5fa;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
`

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
`

const CanvasBox = styled.div`
  width: min(720px, 96vw);
  height: min(66vh, 520px);
  background: #0b1220;
  border-radius: 16px;
  position: relative;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.06), 0 10px 26px rgba(0,0,0,0.24);
  overflow: hidden;
`

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 16px;
  touch-action: none;
  user-select: none;
`

type Ball = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  sliced?: boolean
  color: string
}

type TrailPoint = { x: number; y: number; t: number }

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  max: number
  color: string
}

type FloatText = { x: number; y: number; life: number; max: number; text: string }

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function distanceToSegSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) {
    const dxp = px - x1
    const dyp = py - y1
    return dxp * dxp + dyp * dyp
  }
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
  const tt = Math.max(0, Math.min(1, t))
  const lx = x1 + tt * dx
  const ly = y1 + tt * dy
  const ddx = px - lx
  const ddy = py - ly
  return ddx * ddx + ddy * ddy
}

const BallSlice: React.FC = () => {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [level, setLevel] = React.useState(1)
  const levelRef = React.useRef(1)
  const [score, setScore] = React.useState(0)
  const [miss, setMiss] = React.useState(0)
  const missRef = React.useRef(0)

  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  // game state (not in React to avoid re-render on every frame)
  const ballsRef = React.useRef<Ball[]>([])
  const lastIdRef = React.useRef(1)
  const lastSpawnRef = React.useRef(0)
  const rafRef = React.useRef<number | null>(null)
  const startMsRef = React.useRef<number>(0)
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null)
  const trailRef = React.useRef<TrailPoint[]>([])
  const pointerDownRef = React.useRef(false)
  const dprRef = React.useRef(1)
  const particlesRef = React.useRef<Particle[]>([])
  const textsRef = React.useRef<FloatText[]>([])
  const pauseUntilRef = React.useRef(0)
  const [stageText, setStageText] = React.useState<string | null>(null)
  const [name, setName] = React.useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('slice_name') || '') : '')
  const [last4, setLast4] = React.useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('slice_last4') || '') : '')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitOk, setSubmitOk] = React.useState<boolean | null>(null)

  const requiredForLevel = React.useCallback((lv: number) => 10 + (lv - 1) * 2, [])

  const slicedThisLevelRef = React.useRef(0)

  const resizeCanvas = React.useCallback(() => {
    const c = canvasRef.current
    const box = boxRef.current
    if (!c || !box) return
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
    dprRef.current = dpr
    const rect = box.getBoundingClientRect()
    c.width = Math.floor(rect.width * dpr)
    c.height = Math.floor(rect.height * dpr)
    const ctx = c.getContext("2d")
    if (ctx) {
      ctxRef.current = ctx
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [])

  React.useEffect(() => {
    resizeCanvas()
    const onResize = () => resizeCanvas()
    window.addEventListener("resize", onResize)
    // Observe container size changes for responsive behavior
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && boxRef.current) {
      ro = new ResizeObserver(() => resizeCanvas())
      ro.observe(boxRef.current)
    }
    return () => {
      window.removeEventListener("resize", onResize)
      if (ro) ro.disconnect()
    }
  }, [resizeCanvas])

  const resetLevelState = React.useCallback(() => {
    ballsRef.current = []
    lastSpawnRef.current = 0
    slicedThisLevelRef.current = 0
    particlesRef.current = []
    textsRef.current = []
  }, [])

  const startGame = React.useCallback(() => {
    setPhase("running")
    setScore(0)
    setMiss(0)
    setLevel(1)
    resetLevelState()
    startMsRef.current = performance.now()
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [resetLevelState])

  const endGame = React.useCallback(() => {
    setPhase("over")
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const spawnBall = React.useCallback((w: number) => {
    const r = rand(16, 26)
    const x = rand(r + 8, w - r - 8)
    const y = -r - 10
    const vx = rand(-20, 20)
    const vy = rand(45, 75) + levelRef.current * 4
    const id = ++lastIdRef.current
    const color = `hsl(${Math.floor(rand(0, 360))} 80% 60%)`
    ballsRef.current.push({ id, x, y, vx, vy, r, color })
  }, [])

  const sliceHitTest = React.useCallback((b: Ball, x1: number, y1: number, x2: number, y2: number) => {
    const thr = b.r + 12 // easier slicing tolerance
    const d2 = distanceToSegSq(b.x, b.y, x1, y1, x2, y2)
    return d2 <= thr * thr
  }, [])

  const processTrailHits = React.useCallback((w: number, h: number) => {
    const trail = trailRef.current
    if (trail.length < 2) return
    for (let i = 0; i < ballsRef.current.length; i++) {
      const b = ballsRef.current[i]
      if (b.sliced) continue
      // test recent segments only
      for (let j = trail.length - 2; j >= 0 && j >= trail.length - 6; j--) {
        const p1 = trail[j]
        const p2 = trail[j + 1]
        if (sliceHitTest(b, p1.x, p1.y, p2.x, p2.y)) {
          b.sliced = true
          const add = 10 * levelRef.current
          setScore(s => s + add)
          slicedThisLevelRef.current += 1
          // explosion particles
          const count = 14
          for (let k = 0; k < count; k++) {
            const ang = rand(0, Math.PI * 2)
            const spd = rand(80, 160)
            particlesRef.current.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              r: rand(2, 4),
              life: 0,
              max: 400,
              color: b.color,
            })
          }
          textsRef.current.push({ x: b.x, y: b.y - b.r, life: 0, max: 600, text: `+${add}` })
          break
        }
      }
    }
    // remove sliced balls
    ballsRef.current = ballsRef.current.filter(b => !b.sliced)
  }, [sliceHitTest])

  const blowAwayAllBalls = React.useCallback(() => {
    // convert current balls into particles and clear them
    for (const b of ballsRef.current) {
      const count = 18
      for (let k = 0; k < count; k++) {
        const ang = rand(0, Math.PI * 2)
        const spd = rand(120, 220)
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: rand(2, 4),
          life: 0,
          max: 600,
          color: b.color,
        })
      }
    }
    ballsRef.current = []
  }, [])

  const tick = React.useCallback(() => {
    const c = canvasRef.current
    const ctx = ctxRef.current
    if (!c || !ctx) return
    const w = c.clientWidth
    const h = c.clientHeight

    // spawn control based on level
    const now = performance.now()
    const lv = levelRef.current
    const interval = Math.max(500, 1400 - lv * 90)
    const canSpawn = now >= pauseUntilRef.current
    if (canSpawn && now - lastSpawnRef.current > interval) {
      lastSpawnRef.current = now
      const spawnCount = 1 + Math.floor((lv - 1) / 5)
      for (let i = 0; i < spawnCount; i++) spawnBall(w)
    }

    // physics
    const g = 14 + lv * 3
    const dt = 1 / 60
    for (const b of ballsRef.current) {
      b.vy += g * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
    }
    // miss if out of bottom
    const before = ballsRef.current.length
    ballsRef.current = ballsRef.current.filter(b => b.y - b.r <= h)
    const misses = before - ballsRef.current.length
    if (misses > 0) {
      missRef.current += misses
      setMiss(missRef.current)
    }

    // check trail hits
    processTrailHits(w, h)

    // level up
    if (slicedThisLevelRef.current >= requiredForLevel(lv)) {
      const next = lv + 1
      // stage transition: banner + blow away + short pause
      setStageText(`스테이지 ${next}`)
      setTimeout(() => setStageText(null), 900)
      blowAwayAllBalls()
      slicedThisLevelRef.current = 0
      lastSpawnRef.current = now
      pauseUntilRef.current = now + 1000
      setLevel(next)
      levelRef.current = next
    }

    // draw
    ctx.clearRect(0, 0, w, h)
    // draw balls
    for (const b of ballsRef.current) {
      ctx.beginPath()
      ctx.fillStyle = b.color
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()
    }
    // particles update/draw
    {
      const par = particlesRef.current
      const g2 = 60 // light gravity for particles
      for (let i = par.length - 1; i >= 0; i--) {
        const p = par[i]
        p.life += 1000 * dt
        if (p.life >= p.max) { par.splice(i, 1); continue }
        p.vy += g2 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const a = Math.max(0, 1 - p.life / p.max)
        ctx.beginPath()
        ctx.fillStyle = p.color.replace('hsl', 'hsla').replace(')', ` / ${a.toFixed(2)})`)
        // Fallback if hsla replacement fails
        if (!ctx.fillStyle) ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // floating score text
    {
      const arr = textsRef.current
      ctx.font = 'bold 16px system-ui, -apple-system, Segoe UI, Roboto'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let i = arr.length - 1; i >= 0; i--) {
        const t = arr[i]
        t.life += 1000 * dt
        if (t.life >= t.max) { arr.splice(i, 1); continue }
        const a = Math.max(0, 1 - t.life / t.max)
        t.y -= 20 * dt
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`
        ctx.fillText(t.text, t.x, t.y)
      }
    }
    // draw trail (slash)
    const trail = trailRef.current
    const nowMs = performance.now()
    // keep only last 200 ms of trail
    while (trail.length && nowMs - trail[0].t > 300) trail.shift()
    if (trail.length > 1) {
      ctx.lineWidth = 8
      for (let i = 1; i < trail.length; i++) {
        const a = Math.max(0.1, 1 - (nowMs - trail[i].t) / 200)
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`
        ctx.beginPath()
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
        ctx.lineTo(trail[i].x, trail[i].y)
        ctx.stroke()
      }
    }

    // game over (too many misses)
    if (missRef.current >= 7) {
      endGame()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [endGame, miss, processTrailHits, requiredForLevel, spawnBall, blowAwayAllBalls])
  // keep state and ref in sync when external updates occur
  React.useEffect(() => { missRef.current = miss }, [miss])
  React.useEffect(() => { levelRef.current = level }, [level])

  // pointer handling
  React.useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const rectFromEvent = (ev: PointerEvent) => {
      const rect = c.getBoundingClientRect()
      return {
        x: Math.max(0, Math.min(rect.width, ev.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, ev.clientY - rect.top)),
      }
    }
    const onDown = (ev: PointerEvent) => {
      if (phase !== "running") return
      pointerDownRef.current = true
      c.setPointerCapture(ev.pointerId)
      const p = rectFromEvent(ev)
      trailRef.current.push({ x: p.x, y: p.y, t: performance.now() })
    }
    const onMove = (ev: PointerEvent) => {
      if (!pointerDownRef.current || phase !== "running") return
      const p = rectFromEvent(ev)
      trailRef.current.push({ x: p.x, y: p.y, t: performance.now() })
    }
    const end = (ev?: PointerEvent) => {
      pointerDownRef.current = false
      if (ev) try { c.releasePointerCapture(ev.pointerId) } catch {}
    }
    c.addEventListener("pointerdown", onDown)
    c.addEventListener("pointermove", onMove)
    c.addEventListener("pointerup", end)
    c.addEventListener("pointercancel", end)
    return () => {
      c.removeEventListener("pointerdown", onDown)
      c.removeEventListener("pointermove", onMove)
      c.removeEventListener("pointerup", end)
      c.removeEventListener("pointercancel", end)
    }
  }, [phase])

  // lifecycle cleanup
  React.useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  return (
    <Wrapper>
      <Panel>
        <span>
          레벨: <Stat>{level}</Stat>
        </span>
        <span>
          점수: <Stat>{score}</Stat>
        </span>
        <span>
          미스: <Stat>{miss}/7</Stat>
        </span>
      </Panel>

      <CanvasBox ref={boxRef}>
        <Canvas ref={canvasRef} />
        {stageText ? (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ background:'rgba(0,0,0,0.4)', color:'#fff', padding:'10px 16px', borderRadius:12, fontWeight:900, fontSize:24, boxShadow:'0 8px 18px rgba(0,0,0,0.25)' }}>{stageText}</div>
          </div>
        ) : null}
      </CanvasBox>

      {phase !== "running" ? (
        <PrimaryBtn
          onClick={() => {
            setPhase("running")
            startGame()
          }}
          aria-label={phase === "idle" ? "시작하기" : "다시하기"}
        >
          {phase === "idle" ? "시작하기" : "다시하기"}
        </PrimaryBtn>
      ) : null}

      {phase === "over" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="slice-over-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              background: "#1d1d1f",
              color: "#e6e6e6",
              padding: 20,
              borderRadius: 12,
              width: "min(420px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "grid",
              gap: 12,
            }}
          >
            <h2 id="slice-over-title" style={{ margin: 0 }}>게임 오버</h2>
            <div>최종 점수: <span style={{ color: '#ffd561' }}>{score}</span></div>
            <div style={{ height: 1, background: '#334155', opacity: 0.5 }} />
            <div style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="slice-name" style={{ fontWeight: 800 }}>닉네임</label>
              <Input id="slice-name" value={name} onChange={e => setName(e.target.value)} maxLength={16} placeholder="2~16자" />
              <label htmlFor="slice-last4" style={{ fontWeight: 800 }}>휴대폰 뒷 4자리</label>
              <Input id="slice-last4" value={last4} onChange={e => setLast4(e.target.value.replace(/\D+/g,'').slice(0,4))} inputMode="numeric" maxLength={4} placeholder="1234" />
              <div style={{ color: '#9ca3af', fontSize: 12 }}>서버에는 해시로만 저장되고 원문은 저장되지 않아요.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { setPhase('idle'); setScore(0); setMiss(0); setLevel(1) }} style={{ border:'1px solid #9ca3af', background:'transparent', color:'#e5e7eb', padding:'8px 12px', borderRadius:10, fontWeight:700 }}>닫기</button>
              <PrimaryBtn onClick={async () => {
                if (submitting) return
                const nm = name.trim()
                const l4 = last4.trim()
                if (!(nm.length >= 2 && nm.length <= 16) || !/^\d{4}$/.test(l4)) return
                setSubmitting(true)
                const ok = await submitBallSliceScore({ nickname: nm, last4: l4, score })
                setSubmitOk(ok)
                setSubmitting(false)
                if (ok) {
                  try { localStorage.setItem('slice_name', nm); localStorage.setItem('slice_last4', l4) } catch {}
                }
              }}>{submitting ? '제출 중...' : (submitOk === true ? '제출 완료' : '점수 제출')}</PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default BallSlice
