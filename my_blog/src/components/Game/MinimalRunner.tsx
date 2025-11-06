import React, { useEffect, useRef, useState, useMemo, useCallback } from "react"
import styled from "@emotion/styled"

// Minimal one-key runner with double jump and gentle speed ramp
// - Space/Touch to jump (double jump allowed once in air)
// - Coyote time + input buffer to improve input feel
// - Daily seed for obstacle pattern stability

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px 40px;
  gap: 50px;
`

const Panel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  justify-content: center;
  color: #1f2937;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.92);
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  backdrop-filter: saturate(120%) blur(2px);
`

const Stat = styled.span`
  color: #111827;
  background: #fff3bf;
  padding: 2px 8px;
  border-radius: 8px;
`

const Canvas = styled.canvas`
  width: min(760px, 96vw);
  height: 220px; /* CSS height; actual canvas scaled for DPR */
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  background: linear-gradient(
    180deg,
    #e6f0ff 0%,
    #f8fbff 60%,
    #dff0ff 60%,
    #dff0ff 100%
  );
  touch-action: manipulation; /* make tapping responsive */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
`

const PrimaryBtn = styled.button`
  border: none;
  background: #ffd561;
  color: #111;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
`

const SecondaryBtn = styled.button`
  border: 1px solid #3a3a3a;
  background: transparent;
  color: #e6e6e6;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: none;
`

type Obstacle = {
  x: number
  y: number
  w: number
  h: number
  passed: boolean
  type: "ground" | "lowair"
}

// Simple seeded PRNG (mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// fnv1a hash from string -> 32-bit seed
function xfnv1a(str: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function todaySeed() {
  const d = new Date()
  const key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`
  return xfnv1a(key)
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const formatMeters = (n: number) => `${Math.floor(n)} m`

type RunnerProps = { allowedJumps?: number }

const Runner: React.FC<RunnerProps> = ({ allowedJumps = 2 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [running, setRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [meters, setMeters] = useState(0)
  const [passed, setPassed] = useState(0)
  const [bestToday, setBestToday] = useState<number | null>(null)
  const [bestAll, setBestAll] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [eventLabel, setEventLabel] = useState<string | null>(null)

  // Daily seeded RNG
  const rng = useMemo(() => mulberry32(todaySeed()), [])

  // Persistent bests
  useEffect(() => {
    try {
      const d = new Date()
      const keyDate = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
      const dayKey = `minimal_runner_best_${keyDate}`
      const anyKey = `minimal_runner_best_all`
      const bd = Number(localStorage.getItem(dayKey) || "0") || null
      const ba = Number(localStorage.getItem(anyKey) || "0") || null
      setBestToday(bd)
      setBestAll(ba)
    } catch {}
  }, [])

  // Game state not in React (to keep loop hot)
  const stateRef = useRef({
    t: 0,
    last: 0,
    speed: 220, // slightly slower start speed
    baseSpeed: 220, // slightly slower base speed
    maxSpeed: 540,
    accel: 16, // slightly gentler ramp
    groundY: 170, // canvas logical units before DPR scaling
    playerX: 80,
    playerY: 170,
    vy: 0,
    gravity: 1400, // px/s^2
    onGround: true,
    jumpsUsed: 0,
    allowedJumps: allowedJumps,
    coyoteMs: 110,
    bufferMs: 130,
    lastGroundedAt: 0,
    lastPressAt: -99999,
    obstacles: [] as Obstacle[],
    spawnTimer: 0,
    nextSpawnIn: 0,
    // Tempo events (speed burst or chill)
    nextTempoIn: 0, // seconds until next tempo event
    tempo: {
      active: false as boolean,
      type: null as null | "burst" | "chill",
      t: 0,
      rampIn: 0,
      hold: 0,
      rampOut: 0,
      multTo: 1,
    },
    meters: 0,
    passed: 0,
    score: 0,
    alive: true,
    shakeMs: 0,
    flashMs: 0,
  })

  const setNextSpawn = useCallback(() => {
    const s = stateRef.current
    // Spawn gap depends slightly on speed (shorter gaps at higher speeds), with randomness from daily seed
    const minGap = clamp(420 - (s.speed - 240) * 0.6, 260, 420) // px
    const maxGap = minGap + 220
    const gap = minGap + (maxGap - minGap) * rng()
    s.nextSpawnIn = gap / s.speed // convert to seconds until next spawn
  }, [rng])

  const resetGame = useCallback(() => {
    const s = stateRef.current
    s.t = 0
    s.last = 0
    s.speed = 220
    s.baseSpeed = 220
    s.maxSpeed = 540
    s.accel = 16
    s.groundY = 170
    s.playerX = 80
    s.playerY = s.groundY
    s.vy = 0
    s.gravity = 1400
    s.onGround = true
    s.jumpsUsed = 0
    s.allowedJumps = allowedJumps
    s.coyoteMs = 110
    s.bufferMs = 130
    s.lastGroundedAt = 0
    s.lastPressAt = -99999
    s.obstacles = []
    s.spawnTimer = 0
    s.nextSpawnIn = 0
    // tempo events
    s.nextTempoIn = 4 + 4 * rng() // first event 4~8s
    s.tempo = {
      active: false,
      type: null,
      t: 0,
      rampIn: 0,
      hold: 0,
      rampOut: 0,
      multTo: 1,
    }
    s.meters = 0
    s.passed = 0
    s.score = 0
    s.alive = true
    s.shakeMs = 0
    s.flashMs = 0
    setScore(0)
    setMeters(0)
    setPassed(0)
    setGameOver(false)
    setPaused(false)
    setEventLabel(null)
    setNextSpawn()
  }, [setNextSpawn])

  const tryJump = useCallback((nowMs?: number) => {
    const s = stateRef.current
    if (!s.alive) return false
    const now = nowMs ?? performance.now()
    // can jump if on ground (with coyote), or have remaining jumps (< allowedJumps)
    const coyoteOk = s.onGround || now - s.lastGroundedAt <= s.coyoteMs
    if (coyoteOk || s.jumpsUsed < s.allowedJumps) {
      s.vy = -520 // jump impulse
      s.onGround = false
      s.jumpsUsed += 1
      return true
    } else {
      // buffer input to fire soon when possible
      s.lastPressAt = now
      return false
    }
  }, [])

  // Input handlers: keyboard and pointerdown on canvas (prevents double-fire on mobile)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        if (!running) return
        tryJump()
      }
    }
    const onPointerDown = (_e: PointerEvent) => {
      if (!running) return
      tryJump()
    }
    const el = canvasRef.current
    window.addEventListener("keydown", onKeyDown)
    el?.addEventListener(
      "pointerdown",
      onPointerDown as any,
      { passive: true } as any
    )
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      el?.removeEventListener("pointerdown", onPointerDown as any)
    }
  }, [running, tryJump])

  // Pause/resume on visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPaused(true)
      } else {
        setPaused(false)
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  // Core loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0

    const setupCanvas = () => {
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // draw in CSS pixels
    }
    setupCanvas()
    const onResize = () => setupCanvas()
    window.addEventListener("resize", onResize)

    const s = stateRef.current

    const spawnObstacle = () => {
      const type = rng() < 0.82 ? "ground" : "lowair"
      const w = type === "ground" ? 26 + Math.floor(rng() * 16) : 28
      const h = type === "ground" ? 28 + Math.floor(rng() * 16) : 20
      const y = type === "ground" ? s.groundY - h : s.groundY - 58 // low air at fixed height
      const o: Obstacle = {
        x: canvas.clientWidth + 40,
        y,
        w,
        h,
        passed: false,
        type,
      }
      s.obstacles.push(o)
    }

    const drawGround = () => {
      // ground stripe
      ctx.fillStyle = "#b0d0ff"
      ctx.fillRect(0, s.groundY + 1, canvas.clientWidth, 3)
      ctx.fillStyle = "#cfe8ff"
      ctx.fillRect(
        0,
        s.groundY + 4,
        canvas.clientWidth,
        canvas.clientHeight - s.groundY
      )
      // simple background parallax hills
      ctx.fillStyle = "#e8f2ff"
      const hillY = s.groundY - 40
      for (let i = 0; i < 3; i++) {
        const offset = (s.meters * 0.2) % (canvas.clientWidth + 200)
        const baseX = -offset + i * 220
        ctx.beginPath()
        ctx.moveTo(baseX, hillY)
        ctx.lineTo(baseX + 80, hillY - 30)
        ctx.lineTo(baseX + 160, hillY)
        ctx.closePath()
        ctx.fill()
      }
    }

    const drawPlayer = () => {
      // Body
      ctx.fillStyle = "#111827"
      ctx.fillRect(s.playerX - 10, s.playerY - 20, 20, 20)
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.08)"
      const shadowScale = clamp(1 - (s.groundY - s.playerY) / 140, 0.4, 1)
      ctx.beginPath()
      ctx.ellipse(
        s.playerX,
        s.groundY + 6,
        12 * shadowScale,
        4 * shadowScale,
        0,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    const drawObstacles = () => {
      ctx.fillStyle = "#1f2937"
      for (const o of s.obstacles) {
        ctx.fillRect(o.x, o.y, o.w, o.h)
      }
    }

    const aabbHit = (
      ax: number,
      ay: number,
      aw: number,
      ah: number,
      bx: number,
      by: number,
      bw: number,
      bh: number
    ) => {
      return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
    }

    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
    const easeInCubic = (x: number) => x * x * x

    const step = (now: number) => {
      if (!running) {
        rafId = requestAnimationFrame(step)
        return
      }

      if (s.last === 0) s.last = now
      let dt = (now - s.last) / 1000
      // clamp large dt to avoid jumps after tab hidden
      if (dt > 0.08) dt = 0.016
      s.last = now
      s.t += dt

      // Base speed ramp (no events)
      s.baseSpeed = clamp(s.baseSpeed + s.accel * dt, 240, s.maxSpeed)

      // Tempo events scheduler
      if (!s.tempo.active) {
        s.nextTempoIn -= dt
        if (s.nextTempoIn <= 0) {
          // start new tempo event
          const isBurst = rng() < 0.62 // 62% burst, 38% chill
          s.tempo.active = true
          s.tempo.type = isBurst ? "burst" : "chill"
          s.tempo.t = 0
          if (isBurst) {
            s.tempo.rampIn = 0.35
            s.tempo.hold = 0.9
            s.tempo.rampOut = 1.6
            s.tempo.multTo = 1.2 + rng() * 0.2 // 1.2~1.4x (slightly softer)
            setEventLabel("뛰 뛰 뛰어")
            s.flashMs = 2000
          } else {
            s.tempo.rampIn = 0.3
            s.tempo.hold = 1.1
            s.tempo.rampOut = 1.0
            s.tempo.multTo = 0.7 + rng() * 0.15 // 0.7~0.85x
            setEventLabel("슬로우 러닝")
          }
        }
      } else {
        s.tempo.t += dt
        const total = s.tempo.rampIn + s.tempo.hold + s.tempo.rampOut
        if (s.tempo.t >= total) {
          // end event; schedule next after 7~12s
          s.tempo.active = false
          s.tempo.type = null
          s.tempo.t = 0
          s.nextTempoIn = 7 + 5 * rng()
          setEventLabel(null)
        }
      }

      // Compute current tempo multiplier
      let mult = 1
      if (s.tempo.active) {
        const t = s.tempo.t
        const a = s.tempo.rampIn
        const b = s.tempo.hold
        const c = s.tempo.rampOut
        if (t < a) {
          const k = easeOutCubic(clamp(t / a, 0, 1))
          mult = 1 + (s.tempo.multTo - 1) * k
        } else if (t < a + b) {
          mult = s.tempo.multTo
        } else {
          const k = easeInCubic(clamp((t - a - b) / c, 0, 1))
          mult = s.tempo.multTo + (1 - s.tempo.multTo) * k
        }
      }

      // Effective speed with tempo multiplier (allow brief overshoot up to 1.4x max)
      s.speed = clamp(s.baseSpeed * mult, 200, s.maxSpeed * 1.4)

      // Spawn
      s.spawnTimer += dt
      if (s.spawnTimer >= s.nextSpawnIn) {
        spawnObstacle()
        s.spawnTimer = 0
        setNextSpawn()
      }

      // Move obstacles
      for (const o of s.obstacles) {
        o.x -= s.speed * dt
      }
      // Remove off-screen
      if (s.obstacles.length > 0 && s.obstacles[0].x + s.obstacles[0].w < -40) {
        s.obstacles.shift()
      }

      // Player physics
      s.vy += s.gravity * dt
      s.playerY += s.vy * dt
      // ground collision
      if (s.playerY >= s.groundY) {
        s.playerY = s.groundY
        s.vy = 0
        if (!s.onGround) {
          s.onGround = true
          s.jumpsUsed = 0
        }
        s.lastGroundedAt = performance.now()
      } else {
        s.onGround = false
      }

      // Input buffer consumption while in air: if buffered and possible, auto jump
      if (
        s.lastPressAt > 0 &&
        performance.now() - s.lastPressAt <= s.bufferMs
      ) {
        const coyoteOk =
          s.onGround || performance.now() - s.lastGroundedAt <= s.coyoteMs
        if (coyoteOk || s.jumpsUsed < s.allowedJumps) {
          // consume
          s.lastPressAt = -99999
          s.vy = -520
          s.onGround = false
          s.jumpsUsed += 1
        }
      }

      // Scoring: meters and passed obstacles
      s.meters += (s.speed * dt) / 40 // tuned to feel like meters
      let newlyPassed = 0
      for (const o of s.obstacles) {
        if (!o.passed && o.x + o.w < s.playerX - 10) {
          o.passed = true
          newlyPassed++
        }
      }
      if (newlyPassed) s.passed += newlyPassed
      // base score: meters floor + 5 * passed
      s.score = Math.floor(s.meters) + s.passed * 5

      // Collision check
      const px = s.playerX - 10
      const py = s.playerY - 20
      const pw = 20
      const ph = 20
      for (const o of s.obstacles) {
        // allow small forgiveness margins
        if (
          aabbHit(
            px + 2,
            py + 2,
            pw - 4,
            ph - 2,
            o.x + 1,
            o.y + 1,
            o.w - 2,
            o.h - 2
          )
        ) {
          s.alive = false
          setGameOver(true)
          setRunning(false)
          // persist bests
          try {
            const d = new Date()
            const keyDate = `${d.getFullYear()}-${(d.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
            const dayKey = `minimal_runner_best_${keyDate}`
            const anyKey = `minimal_runner_best_all`
            const prevD = Number(localStorage.getItem(dayKey) || "0")
            const prevA = Number(localStorage.getItem(anyKey) || "0")
            if (!prevD || s.score > prevD)
              localStorage.setItem(dayKey, String(s.score))
            if (!prevA || s.score > prevA)
              localStorage.setItem(anyKey, String(s.score))
            setBestToday(prev => (!prev || s.score > prev ? s.score : prev))
            setBestAll(prev => (!prev || s.score > prev ? s.score : prev))
          } catch {}
          break
        }
      }

      // Minimal camera shake on landing impact
      if (s.onGround && Math.abs(s.vy) < 0.00001 && s.shakeMs > 0) {
        s.shakeMs -= dt * 1000
      }
      // Fade out red flash (burst cue)
      if (s.flashMs > 0) {
        s.flashMs = Math.max(0, s.flashMs - dt * 1000)
      }

      // Draw
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      // optional shake
      const drawFlash = () => {
        if (s.flashMs > 0) {
          const a = Math.min(1, s.flashMs / 380) * 0.35
          ctx.fillStyle = `rgba(239, 68, 68, ${a})` // red tint
          // draw after ground but before obstacles/player to tint background only
          ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
        }
      }
      if (s.shakeMs > 0) {
        const mag = (s.shakeMs / 100) * 2
        ctx.save()
        ctx.translate((rng() - 0.5) * mag, (rng() - 0.5) * mag)
        drawGround()
        drawFlash()
        drawObstacles()
        drawPlayer()
        ctx.restore()
      } else {
        drawGround()
        drawFlash()
        drawObstacles()
        drawPlayer()
      }

      // push visible stats once per frame (cheap)
      if (running) {
        setMeters(s.meters)
        setPassed(s.passed)
        setScore(s.score)
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", onResize)
    }
  }, [running, setNextSpawn, rng])

  const startGame = useCallback(() => {
    resetGame()
    setRunning(true)
    // kick an initial jump buffer so immediate press is responsive after start
    const s = stateRef.current
    s.last = 0
  }, [resetGame])

  const restart = useCallback(() => {
    startGame()
  }, [startGame])

  const jumpLabel = React.useMemo(() => {
    if (allowedJumps === 2) return "더블 점프"
    if (allowedJumps === 3) return "트리플 점프"
    return `${allowedJumps}회 점프`
  }, [allowedJumps])

  return (
    <Wrapper>
      <h1
        style={{ color: "#1b1b1b", margin: 0, fontSize: 20, fontWeight: 900 }}
      >
        화면 터치로 점프 세번 가능
      </h1>

      <Panel>
        <span>
          점수: <Stat>{score}</Stat>
        </span>
        <span>
          거리: <Stat>{formatMeters(meters)}</Stat>
        </span>
        <span>
          통과: <Stat>{passed}</Stat>
        </span>
        {bestToday ? (
          <span>
            오늘 최고: <Stat>{bestToday}</Stat>
          </span>
        ) : null}
        {bestAll ? (
          <span>
            역대 최고: <Stat>{bestAll}</Stat>
          </span>
        ) : null}
      </Panel>

      <div style={{ position: "relative" }}>
        <Canvas ref={canvasRef} aria-label="게임 화면" />
        {eventLabel && running && !gameOver && (
          <div
            aria-hidden
            style={{
              width: "100%",
              textAlign: "center",
              position: "absolute",
              top: 5,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(17,24,39,0.85)",
              color: "#ffd561",
              padding: "6px 12px",
              borderRadius: 999,
              fontWeight: 900,
              letterSpacing: 1,
              boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            }}
          >
            {eventLabel}
          </div>
        )}
        {!running && !gameOver && (
          <div
            role="dialog"
            aria-modal="false"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.9)",
                padding: 16,
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ marginBottom: 10, textAlign: "center" }}>
                스페이스 / 화면 터치로 점프 (가로가 유리해요)
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <PrimaryBtn onClick={startGame} aria-label="게임 시작">
                  시작
                </PrimaryBtn>
              </div>
            </div>
          </div>
        )}
        {gameOver && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#e6e6e6",
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
              }}
            >
              <h2 style={{ margin: "0 0 10px", color: "#fff" }}>게임 오버</h2>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginBottom: 16,
                  fontWeight: 700,
                }}
              >
                <div>
                  점수: <span style={{ color: "#ffd561" }}>{score}</span>
                </div>
                <div>
                  거리:{" "}
                  <span style={{ color: "#ffd561" }}>
                    {formatMeters(meters)}
                  </span>
                </div>
                <div>
                  통과: <span style={{ color: "#ffd561" }}>{passed}</span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <PrimaryBtn onClick={restart} aria-label="다시하기">
                  다시하기
                </PrimaryBtn>
              </div>
            </div>
          </div>
        )}
      </div>

      {!running && !gameOver ? (
        <span style={{ color: "#1b1b1b" }}>누가누가 오래 뛸까?</span>
      ) : null}
    </Wrapper>
  )
}

export default Runner
