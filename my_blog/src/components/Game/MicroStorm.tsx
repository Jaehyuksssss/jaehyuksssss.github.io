import React from "react"
import styled from "@emotion/styled"
import { submitStormScore } from "lib/stormApi"

type Phase = "idle" | "running" | "over"

type Skin = "emoji" | "mole"

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

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
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
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
`

const SecondaryBtn = styled.button`
  border: 1px solid #9ca3af;
  background: transparent;
  color: #374151;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
`

const CanvasBox = styled.div`
  width: min(520px, 96vw);
  height: min(72vh, 520px);
  background: linear-gradient(180deg, #eef7ff 0%, #f9fbff 60%, #e7f2ff 100%);
  border-radius: 16px;
  position: relative;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06),
    0 10px 26px rgba(0, 0, 0, 0.16);
  overflow: hidden;
`

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 16px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
`

type BulletType = "linear" | "spiral" | "homing"

type Bullet = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  type: BulletType
  theta?: number
  omega?: number
  speed?: number
  turnRate?: number
}

type ItemKind = "slow" | "shield"
type Item = { x: number; y: number; r: number; kind: ItemKind; life: number }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

// Simple seeded RNG using mulberry32
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function todaySeed() {
  const d = new Date()
  const key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const MicroStorm: React.FC = () => {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [score, setScore] = React.useState(0)
  const [surviveMs, setSurviveMs] = React.useState(0)
  const [slowRemain, setSlowRemain] = React.useState(0)
  const [slowCooldown, setSlowCooldown] = React.useState(0)
  const [shieldRemain, setShieldRemain] = React.useState(0)
  const [skin, setSkin] = React.useState<Skin>("emoji")
  const [emojiChar, setEmojiChar] = React.useState("🐥")
  const skinRef = React.useRef<Skin>("emoji")
  const emojiRef = React.useRef("🐥")
  const moleImgRef = React.useRef<HTMLImageElement | null>(null)

  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const rng = React.useMemo(() => mulberry32(todaySeed()), [])

  // submit state
  const [nickname, setNickname] = React.useState("")
  const [last4, setLast4] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitOk, setSubmitOk] = React.useState<boolean | null>(null)

  // game state in refs for performance
  const rafRef = React.useRef<number | null>(null)
  const runningRef = React.useRef(false)
  const startAtRef = React.useRef<number>(0)
  const lastMsRef = React.useRef<number>(0)

  const dprRef = React.useRef(1)
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = React.useRef({ w: 0, h: 0 })

  const playerRef = React.useRef({ x: 0, y: 0, r: 12 })
  const draggingRef = React.useRef(false)
  const pointerIdRef = React.useRef<number | null>(null)

  const bulletsRef = React.useRef<Bullet[]>([])
  const itemsRef = React.useRef<Item[]>([])

  const slowMsRef = React.useRef(0)
  const slowCdRef = React.useRef(0)
  const shieldMsRef = React.useRef(0)
  const scoreRef = React.useRef(0)

  const waveTimerRef = React.useRef(0)
  const spawnTimerRef = React.useRef(0)
  const itemTimerRef = React.useRef(0)
  const cornerStayMsRef = React.useRef(0)
  const antiCampCdRef = React.useRef(0)

  const resetGame = React.useCallback(() => {
    const c = canvasRef.current
    const box = boxRef.current
    if (!c || !box) return
    const rect = box.getBoundingClientRect()
    sizeRef.current = { w: rect.width, h: rect.height }
    playerRef.current = { x: rect.width / 2, y: rect.height / 2, r: 12 }
    bulletsRef.current = []
    itemsRef.current = []
    slowMsRef.current = 0
    slowCdRef.current = 0
    shieldMsRef.current = 0
    scoreRef.current = 0
    waveTimerRef.current = 0
    spawnTimerRef.current = 0
    itemTimerRef.current = 0
    setScore(0)
    setSurviveMs(0)
    setSlowRemain(0)
    setSlowCooldown(0)
    setShieldRemain(0)
  }, [])

  const setupCanvas = React.useCallback(() => {
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
    sizeRef.current = { w: rect.width, h: rect.height }
  }, [])

  // keep latest skin/emoji for the RAF loop
  React.useEffect(() => {
    skinRef.current = skin
  }, [skin])
  React.useEffect(() => {
    emojiRef.current = emojiChar
  }, [emojiChar])
  React.useEffect(() => {
    // preload mole sprite
    if (typeof window === "undefined") return
    const img = new Image()
    img.src = "/mole.png"
    moleImgRef.current = img
  }, [])

  React.useEffect(() => {
    setupCanvas()
    const onResize = () => setupCanvas()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [setupCanvas])

  // pointer drag control
  React.useEffect(() => {
    const c = canvasRef.current
    if (!c) return

    const supportsPointer =
      typeof window !== "undefined" && "PointerEvent" in window

    const rectFromXY = (clientX: number, clientY: number) => {
      const rect = c.getBoundingClientRect()
      return {
        x: clamp(clientX - rect.left, 0, rect.width),
        y: clamp(clientY - rect.top, 0, rect.height),
      }
    }

    // Pointer events path
    const onPointerDown = (ev: PointerEvent) => {
      if (phase !== "running") return
      ev.preventDefault()
      draggingRef.current = true
      pointerIdRef.current = ev.pointerId
      try {
        c.setPointerCapture(ev.pointerId)
      } catch {}
      const p = rectFromXY(ev.clientX, ev.clientY)
      playerRef.current.x = p.x
      playerRef.current.y = p.y
    }
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current || phase !== "running") return
      ev.preventDefault()
      const p = rectFromXY(ev.clientX, ev.clientY)
      playerRef.current.x = p.x
      playerRef.current.y = p.y
    }
    const onPointerUp = (_ev: PointerEvent) => {
      draggingRef.current = false
      if (pointerIdRef.current != null) {
        try {
          c.releasePointerCapture(pointerIdRef.current)
        } catch {}
      }
      pointerIdRef.current = null
    }

    // Touch fallback (older iOS)
    const onTouchStart = (ev: TouchEvent) => {
      if (phase !== "running") return
      if (ev.touches.length === 0) return
      ev.preventDefault()
      draggingRef.current = true
      const t = ev.touches[0]
      const p = rectFromXY(t.clientX, t.clientY)
      playerRef.current.x = p.x
      playerRef.current.y = p.y
    }
    const onTouchMove = (ev: TouchEvent) => {
      if (!draggingRef.current || phase !== "running") return
      if (ev.touches.length === 0) return
      ev.preventDefault()
      const t = ev.touches[0]
      const p = rectFromXY(t.clientX, t.clientY)
      playerRef.current.x = p.x
      playerRef.current.y = p.y
    }
    const onTouchEnd = (_ev: TouchEvent) => {
      draggingRef.current = false
    }

    if (supportsPointer) {
      c.addEventListener(
        "pointerdown",
        onPointerDown as any,
        { passive: false } as any
      )
      c.addEventListener(
        "pointermove",
        onPointerMove as any,
        { passive: false } as any
      )
      c.addEventListener("pointerup", onPointerUp as any)
      c.addEventListener("pointercancel", onPointerUp as any)
    } else {
      c.addEventListener(
        "touchstart",
        onTouchStart as any,
        { passive: false } as any
      )
      c.addEventListener(
        "touchmove",
        onTouchMove as any,
        { passive: false } as any
      )
      c.addEventListener("touchend", onTouchEnd as any)
      c.addEventListener("touchcancel", onTouchEnd as any)
    }
    return () => {
      if (supportsPointer) {
        c.removeEventListener("pointerdown", onPointerDown as any)
        c.removeEventListener("pointermove", onPointerMove as any)
        c.removeEventListener("pointerup", onPointerUp as any)
        c.removeEventListener("pointercancel", onPointerUp as any)
      } else {
        c.removeEventListener("touchstart", onTouchStart as any)
        c.removeEventListener("touchmove", onTouchMove as any)
        c.removeEventListener("touchend", onTouchEnd as any)
        c.removeEventListener("touchcancel", onTouchEnd as any)
      }
    }
  }, [phase])

  const spawnLinearWave = React.useCallback(() => {
    const { w, h } = sizeRef.current
    const side = Math.floor(rng() * 4) // 0 top,1 right,2 bottom,3 left
    const count = 4 + Math.floor(rng() * 4) // 4~7
    const speed = 120 + rng() * 60
    for (let i = 0; i < count; i++) {
      let x = 0,
        y = 0,
        vx = 0,
        vy = 0
      const r = 9 + rng() * 3
      if (side === 0) {
        // top → down
        x = (w / (count + 1)) * (i + 1)
        y = -r - 10
        vx = 0
        vy = speed
      } else if (side === 1) {
        // right → left
        x = w + r + 10
        y = (h / (count + 1)) * (i + 1)
        vx = -speed
        vy = 0
      } else if (side === 2) {
        // bottom → up
        x = (w / (count + 1)) * (i + 1)
        y = h + r + 10
        vx = 0
        vy = -speed
      } else {
        // left → right
        x = -r - 10
        y = (h / (count + 1)) * (i + 1)
        vx = speed
        vy = 0
      }
      bulletsRef.current.push({ x, y, vx, vy, r, type: "linear" })
    }
  }, [rng])

  const spawnSpiral = React.useCallback(() => {
    const { w, h } = sizeRef.current
    const cx = w / 2,
      cy = h / 2
    const ring = Math.max(w, h) * 0.6
    const bullets = 10
    const omega = 0.7 + rng() * 0.5
    const speed = 90 + rng() * 50
    for (let i = 0; i < bullets; i++) {
      const a = (i / bullets) * Math.PI * 2 + rng() * 0.5
      const x = cx + Math.cos(a) * ring
      const y = cy + Math.sin(a) * ring
      const dx = cx - x
      const dy = cy - y
      const len = Math.hypot(dx, dy) || 1
      const vx = (dx / len) * speed
      const vy = (dy / len) * speed
      bulletsRef.current.push({
        x,
        y,
        vx,
        vy,
        r: 9 + rng() * 2,
        type: "spiral",
        theta: a,
        omega,
        speed,
      })
    }
  }, [rng])

  const spawnItem = React.useCallback(() => {
    const { w, h } = sizeRef.current
    const kind: ItemKind = rng() < 0.55 ? "slow" : "shield"
    const margin = 24
    const x = margin + rng() * (w - margin * 2)
    const y = margin + rng() * (h - margin * 2)
    itemsRef.current.push({ x, y, r: 12, kind, life: 10_000 })
  }, [rng])

  const spawnCornerSweep = React.useCallback(() => {
    const { w, h } = sizeRef.current
    const edge = Math.floor(rng() * 4)
    const cnt = 3 + Math.floor(rng() * 3)
    const speed = 120 + rng() * 60
    for (let i = 0; i < cnt; i++) {
      let x = 0,
        y = 0,
        vx = 0,
        vy = 0
      const r = 10
      const t = cnt === 1 ? 0.5 : i / (cnt - 1)
      if (edge === 0) {
        x = t * w
        y = -r - 8
        vx = 0
        vy = speed
      } else if (edge === 1) {
        x = w + r + 8
        y = t * h
        vx = -speed
        vy = 0
      } else if (edge === 2) {
        x = t * w
        y = h + r + 8
        vx = 0
        vy = -speed
      } else {
        x = -r - 8
        y = t * h
        vx = speed
        vy = 0
      }
      bulletsRef.current.push({ x, y, vx, vy, r, type: "linear" })
    }
  }, [rng])

  const spawnHomingPulse = React.useCallback(() => {
    const { w, h } = sizeRef.current
    const px = playerRef.current.x
    const py = playerRef.current.y
    const fromSide = Math.floor(rng() * 4)
    const n = 2 + Math.floor(rng() * 2)
    const baseSpeed = 120 + rng() * 60
    for (let i = 0; i < n; i++) {
      let x = 0,
        y = 0
      if (fromSide === 0) {
        x = rng() * w
        y = -16
      } else if (fromSide === 1) {
        x = w + 16
        y = rng() * h
      } else if (fromSide === 2) {
        x = rng() * w
        y = h + 16
      } else {
        x = -16
        y = rng() * h
      }
      const ang = Math.atan2(py - y, px - x)
      const vx = Math.cos(ang) * baseSpeed
      const vy = Math.sin(ang) * baseSpeed
      bulletsRef.current.push({
        x,
        y,
        vx,
        vy,
        r: 10,
        type: "homing",
        speed: baseSpeed,
        turnRate: 1.2 + rng() * 0.6,
      })
    }
  }, [rng])

  const startGame = React.useCallback(() => {
    resetGame()
    setPhase("running")
    runningRef.current = true
    startAtRef.current = performance.now()
    lastMsRef.current = startAtRef.current
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endGame = React.useCallback(() => {
    setPhase("over")
    runningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const tryUseSlow = React.useCallback(() => {
    if (slowCdRef.current > 0 || slowMsRef.current > 0) return
    slowMsRef.current = 3000
    slowCdRef.current = 12000
  }, [])

  const grantShield = React.useCallback(() => {
    shieldMsRef.current = 15000
  }, [])

  const tick = () => {
    const now = performance.now()
    const rawDt = now - lastMsRef.current
    lastMsRef.current = now
    let dt = Math.min(33, rawDt)
    const slowMult = slowMsRef.current > 0 ? 0.6 : 1
    dt *= slowMult

    // timers
    if (slowMsRef.current > 0)
      slowMsRef.current = Math.max(0, slowMsRef.current - rawDt)
    if (slowCdRef.current > 0)
      slowCdRef.current = Math.max(0, slowCdRef.current - rawDt)
    if (shieldMsRef.current > 0)
      shieldMsRef.current = Math.max(0, shieldMsRef.current - rawDt)
    setSlowRemain(slowMsRef.current)
    setSlowCooldown(slowCdRef.current)
    setShieldRemain(shieldMsRef.current)

    // survival/score
    const elapsed = now - startAtRef.current
    setSurviveMs(elapsed)
    // score: time-based + small bonus when slow not active
    scoreRef.current += (slowMsRef.current > 0 ? 6 : 10) * (dt / 1000)
    setScore(Math.floor(scoreRef.current))

    // wave spawning (tuned easier) + variety
    waveTimerRef.current += dt
    if (waveTimerRef.current >= 3600) {
      waveTimerRef.current = 0
      const r = rng()
      if (r < 0.4) spawnLinearWave()
      else if (r < 0.75) spawnSpiral()
      else spawnHomingPulse()
    }
    // ongoing bullet trickle
    spawnTimerRef.current += dt
    const baseGap = 1100
    if (spawnTimerRef.current >= baseGap) {
      spawnTimerRef.current = 0
      if (rng() < 0.6) spawnLinearWave()
      else spawnCornerSweep()
    }
    // item spawn occasionally
    itemTimerRef.current += dt
    if (itemTimerRef.current >= 5000) {
      itemTimerRef.current = 0
      if (itemsRef.current.length === 0 && rng() < 0.7) spawnItem()
    }

    // update bullets
    const { w, h } = sizeRef.current
    const px = playerRef.current.x
    const py = playerRef.current.y
    const pr = playerRef.current.r
    const newBullets: Bullet[] = []
    let hit = false
    for (const b of bulletsRef.current) {
      if (b.type === "spiral" && b.omega && b.speed) {
        b.theta = (b.theta || 0) + b.omega * (dt / 1000)
        // add tangential component to current velocity
        const tang = 0.5
        const vx2 = b.vx + Math.cos(b.theta) * tang
        const vy2 = b.vy + Math.sin(b.theta) * tang
        const len = Math.hypot(vx2, vy2) || 1
        b.vx = (vx2 / len) * b.speed
        b.vy = (vy2 / len) * b.speed
      } else if (b.type === "homing" && b.speed) {
        const desired = Math.atan2(py - b.y, px - b.x)
        const cur = Math.atan2(b.vy, b.vx)
        let diff = desired - cur
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        const maxTurn = (b.turnRate ?? 1.2) * (dt / 1000)
        const turn = clamp(diff, -maxTurn, maxTurn)
        const ang = cur + turn
        b.vx = Math.cos(ang) * b.speed!
        b.vy = Math.sin(ang) * b.speed!
      }
      b.x += (b.vx * dt) / 1000
      b.y += (b.vy * dt) / 1000
      // keep
      if (b.x > -30 && b.x < w + 30 && b.y > -30 && b.y < h + 30)
        newBullets.push(b)

      // collision
      const rr = (b.r + pr) * (b.r + pr)
      if (dist2(b.x, b.y, px, py) <= rr) {
        if (shieldMsRef.current > 0) {
          // consume shield and ignore this bullet
          shieldMsRef.current = Math.max(0, shieldMsRef.current - 400)
          // skip adding this bullet
          newBullets.pop()
          continue
        } else {
          hit = true
        }
      }
    }
    bulletsRef.current = newBullets

    // items
    const newItems: Item[] = []
    for (const it of itemsRef.current) {
      it.life -= dt
      if (it.life > 0) newItems.push(it)
      const rr = (it.r + pr) * (it.r + pr)
      if (dist2(it.x, it.y, px, py) <= rr) {
        if (it.kind === "slow") tryUseSlow()
        else grantShield()
      }
    }
    itemsRef.current = newItems

    // draw
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (ctx && c) {
      ctx.clearRect(0, 0, c.clientWidth, c.clientHeight)
      // wind lines near edges
      ctx.strokeStyle = "rgba(96,165,250,0.25)"
      ctx.lineWidth = 2
      for (let i = 0; i < 6; i++) {
        const y = ((i + 1) / 7) * c.clientHeight
        ctx.beginPath()
        ctx.moveTo(10, y)
        ctx.lineTo(c.clientWidth - 10, y)
        ctx.stroke()
      }

      // items
      for (const it of itemsRef.current) {
        ctx.save()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = it.kind === "slow" ? "#a78bfa" : "#34d399"
        ctx.beginPath()
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#111"
        ctx.font = "bold 12px system-ui, -apple-system, Segoe UI"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(
          it.kind === "slow" ? "S" : "🛡",
          it.x,
          it.y + (it.kind === "slow" ? 0 : 1)
        )
        ctx.restore()
      }

      // bullets as tornado emoji
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      for (const b of bulletsRef.current) {
        const size = Math.max(18, Math.round(b.r * 2.4))
        ctx.font = `${size}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui`
        ctx.fillText("🌪", b.x, b.y + 1)
      }

      // player
      if (skinRef.current === "emoji") {
        ctx.font =
          "24px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(emojiRef.current, playerRef.current.x, playerRef.current.y)
      } else if (skinRef.current === "mole") {
        const img = moleImgRef.current
        const size = 28
        if (img && img.complete) {
          ctx.drawImage(
            img,
            playerRef.current.x - size / 2,
            playerRef.current.y - size / 2,
            size,
            size
          )
        } else {
          // fallback circle if image not ready
          ctx.fillStyle = "#2563eb"
          ctx.beginPath()
          ctx.arc(
            playerRef.current.x,
            playerRef.current.y,
            playerRef.current.r,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }

      // shield ring
      if (shieldMsRef.current > 0) {
        ctx.strokeStyle = "rgba(52,211,153,0.85)"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(
          playerRef.current.x,
          playerRef.current.y,
          playerRef.current.r + 6,
          0,
          Math.PI * 2
        )
        ctx.stroke()
      }
    }

    // anti-camping corner check
    if (antiCampCdRef.current > 0)
      antiCampCdRef.current = Math.max(0, antiCampCdRef.current - rawDt)
    {
      const { w, h } = sizeRef.current
      const cornerMargin = Math.min(w, h) * 0.18
      const inCorner =
        (px < cornerMargin && py < cornerMargin) ||
        (px > w - cornerMargin && py < cornerMargin) ||
        (px < cornerMargin && py > h - cornerMargin) ||
        (px > w - cornerMargin && py > h - cornerMargin)
      if (inCorner) cornerStayMsRef.current += rawDt
      else
        cornerStayMsRef.current = Math.max(
          0,
          cornerStayMsRef.current - rawDt * 2
        )
      if (
        runningRef.current &&
        antiCampCdRef.current === 0 &&
        cornerStayMsRef.current > 1200
      ) {
        spawnHomingPulse()
        antiCampCdRef.current = 2200
        cornerStayMsRef.current = 0
      }
    }

    if (runningRef.current && !hit) {
      rafRef.current = requestAnimationFrame(tick)
    } else if (hit) {
      endGame()
    }
  }

  // cleanup
  React.useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  const onSubmit = React.useCallback(async () => {
    if (submitting) return
    const nm = nickname.trim()
    const l4 = last4.trim()
    if (!(nm.length >= 2 && nm.length <= 16) || !/^\d{4}$/.test(l4)) return
    setSubmitting(true)
    const ok = await submitStormScore({
      nickname: nm,
      last4: l4,
      score,
      surviveMs,
    })
    setSubmitting(false)
    setSubmitOk(ok)
    if (ok) {
      try {
        localStorage.setItem("storm_name", nm)
        localStorage.setItem("storm_last4", l4)
      } catch {}
    }
  }, [nickname, last4, score, surviveMs, submitting])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setNickname(localStorage.getItem("storm_name") || "")
        setLast4(localStorage.getItem("storm_last4") || "")
      } catch {}
    }
  }, [])

  return (
    <Wrapper>
      <Panel>
        <span>
          생존: <Stat>{Math.ceil(surviveMs / 1000)}s</Stat>
        </span>
        <span>
          점수: <Stat>{score}</Stat>
        </span>
        <span>
          슬로우:{" "}
          <Stat>
            {slowRemain > 0
              ? `${Math.ceil(slowRemain / 1000)}s`
              : slowCooldown > 0
              ? `쿨 ${Math.ceil(slowCooldown / 1000)}s`
              : "준비됨"}
          </Stat>
        </span>
        <span>
          쉴드:{" "}
          <Stat>
            {shieldRemain > 0 ? `${Math.ceil(shieldRemain / 1000)}s` : "없음"}
          </Stat>
        </span>
      </Panel>

      <CanvasBox ref={boxRef}>
        <Canvas ref={canvasRef} />
        {phase !== "running" ? (
          <div
            role="dialog"
            aria-modal={phase === "over"}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                background:
                  phase === "over" ? "#1d1d1f" : "rgba(255,255,255,0.94)",
                color: phase === "over" ? "#e6e6e6" : "#111",
                padding: 18,
                borderRadius: 12,
                width: "min(420px, 92vw)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                display: "grid",
                gap: 10,
              }}
            >
              {phase === "idle" ? (
                <>
                  <h2 style={{ margin: 0 }}>미니 태풍 피하기</h2>
                  <div style={{ fontWeight: 700 }}>캐릭터 선택</div>
                  {(() => {
                    const sel = {
                      borderColor: "#f59e0b",
                      background: "#fff7ed",
                      boxShadow: "0 0 0 2px rgba(245,158,11,0.2) inset",
                    }
                    return (
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <SecondaryBtn
                          onClick={() => {
                            setSkin("emoji")
                            setEmojiChar("🐥")
                          }}
                          aria-label="병아리"
                          style={skin === "emoji" ? (sel as any) : undefined}
                        >
                          병아리 🐥
                        </SecondaryBtn>
                        <SecondaryBtn
                          onClick={() => setSkin("mole")}
                          aria-label="두더지"
                          style={skin === "mole" ? (sel as any) : undefined}
                        >
                          두더지{" "}
                          <img
                            src="/mole.png"
                            alt="두더지"
                            style={{
                              width: 16,
                              height: 16,
                              verticalAlign: "middle",
                            }}
                          />
                        </SecondaryBtn>
                      </div>
                    )
                  })()}
                  <PrimaryBtn onClick={startGame} aria-label="시작">
                    시작
                  </PrimaryBtn>
                </>
              ) : (
                <>
                  <h2 style={{ margin: 0 }}>게임 오버</h2>
                  <div style={{ fontWeight: 700 }}>
                    생존 {Math.ceil(surviveMs / 1000)}초 · 점수{" "}
                    <span style={{ color: "#ffd561" }}>{score}</span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label htmlFor="storm-name" style={{ fontWeight: 800 }}>
                      닉네임
                    </label>
                    <Input
                      id="storm-name"
                      placeholder="2~16자"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      maxLength={16}
                    />
                    <label htmlFor="storm-last4" style={{ fontWeight: 800 }}>
                      휴대폰 뒷 4자리
                    </label>
                    <Input
                      id="storm-last4"
                      placeholder="1234"
                      value={last4}
                      onChange={e =>
                        setLast4(e.target.value.replace(/\D+/g, "").slice(0, 4))
                      }
                      inputMode="numeric"
                      maxLength={4}
                    />
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      서버에는 해시로만 저장되고 원문은 저장되지 않아요.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                      flexWrap: "wrap",
                    }}
                  >
                    <SecondaryBtn onClick={() => setPhase("idle")}>
                      닫기
                    </SecondaryBtn>
                    <PrimaryBtn
                      disabled={
                        submitting ||
                        nickname.trim().length < 2 ||
                        last4.trim().length !== 4
                      }
                      onClick={onSubmit}
                    >
                      {submitting
                        ? "제출 중..."
                        : submitOk === true
                        ? "제출 완료"
                        : "점수 제출"}
                    </PrimaryBtn>
                    <PrimaryBtn onClick={startGame}>다시하기</PrimaryBtn>
                  </div>
                  {submitOk === false ? (
                    <div style={{ color: "#fca5a5", fontSize: 13 }}>
                      제출에 실패했어요. 잠시 후 다시 시도해주세요.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </CanvasBox>
    </Wrapper>
  )
}

export default MicroStorm
