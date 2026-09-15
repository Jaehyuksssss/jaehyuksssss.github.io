import React from "react"
import styled from "@emotion/styled"

type Phase = "idle" | "running" | "over"
type BossMode = "safe" | "warning" | "watching"

const GAME_DURATION_MS = 60_000
const CANVAS_WIDTH = 760
const CANVAS_HEIGHT = 400
const CANVAS_SCALE = 2
const BEST_SCORE_KEY = "office_escape_best_score"
const BEST_ESCAPES_KEY = "office_escape_best_escapes"

const Wrapper = styled.section`
  width: min(800px, 100%);
  margin: 0 auto;
  padding: 12px 12px 48px;
  color: #172033;
`

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 14px;

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
`

const Heading = styled.div`
  h1 {
    margin: 0 0 4px;
    color: #172033;
    font-size: clamp(28px, 6vw, 42px);
    font-weight: 900;
    letter-spacing: -1.5px;
  }

  p {
    margin: 0;
    color: #61708a;
    font-size: 14px;
    font-weight: 700;
  }
`

const BestBadge = styled.div`
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid #d9dfeb;
  border-radius: 999px;
  background: #ffffff;
  color: #536078;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 5px 16px rgba(39, 52, 82, 0.08);
`

const GameCard = styled.div`
  overflow: hidden;
  border: 1px solid rgba(28, 39, 64, 0.12);
  border-radius: 22px;
  background: #f8fafc;
  box-shadow: 0 20px 50px rgba(27, 39, 68, 0.16);
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #dce2ec;
  border-bottom: 1px solid #dce2ec;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const Stat = styled.div`
  min-width: 0;
  padding: 10px 8px;
  background: #ffffff;
  text-align: center;

  span {
    display: block;
    margin-bottom: 2px;
    color: #8490a3;
    font-size: 11px;
    font-weight: 800;
  }

  strong {
    display: block;
    overflow: hidden;
    color: #172033;
    font-size: 18px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const StatusBar = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: #f8fafc;
`

const StatusPill = styled.span<{ mode: BossMode }>`
  min-width: 86px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ mode }) =>
    mode === "safe" ? "#dff7e8" : mode === "warning" ? "#fff1bc" : "#fee2e2"};
  color: ${({ mode }) =>
    mode === "safe" ? "#167143" : mode === "warning" ? "#976000" : "#b91c1c"};
  font-size: 12px;
  font-weight: 900;
  text-align: center;
`

const ProgressTrack = styled.div`
  position: relative;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e3e8ef;
`

const ProgressFill = styled.div<{ progress: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ progress }) => Math.max(0, Math.min(1, progress)) * 100}%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffbf45 0%, #ff7b54 100%);
  transition: width 80ms linear;
`

const CanvasWrap = styled.div`
  position: relative;
  background: #efe8dc;
`

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: ${CANVAS_WIDTH} / ${CANVAS_HEIGHT};
  outline: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    box-shadow: inset 0 0 0 4px #3b82f6;
  }
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(18, 27, 45, 0.68);
  backdrop-filter: blur(3px);
`

const OverlayCard = styled.div`
  width: min(410px, 94%);
  padding: 22px 20px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  text-align: center;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.28);

  h2 {
    margin: 0 0 8px;
    color: #172033;
    font-size: clamp(22px, 5vw, 32px);
    font-weight: 900;
  }

  p {
    margin: 0 0 16px;
    color: #5d687b;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.65;
  }
`

const PrimaryButton = styled.button`
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 13px 16px;
  background: linear-gradient(135deg, #ffcf55 0%, #ff9f43 100%);
  color: #2c2108;
  cursor: pointer;
  font-size: 17px;
  font-weight: 900;
  box-shadow: 0 8px 20px rgba(239, 145, 35, 0.28);

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 3px solid #3b82f6;
    outline-offset: 2px;
  }
`

const Controls = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  background: #ffffff;
`

const HoldButton = styled.button<{ active: boolean }>`
  min-height: 64px;
  border: 0;
  border-radius: 14px;
  background: ${({ active }) =>
    active
      ? "linear-gradient(180deg, #f38b52 0%, #e75f42 100%)"
      : "linear-gradient(180deg, #ffdd6f 0%, #ffc247 100%)"};
  color: #2d2515;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  font-size: clamp(16px, 4vw, 20px);
  font-weight: 900;
  letter-spacing: -0.2px;
  box-shadow: ${({ active }) =>
    active
      ? "inset 0 4px 10px rgba(117, 47, 23, 0.22)"
      : "0 7px 0 #dca02f, 0 12px 22px rgba(95, 66, 14, 0.16)"};
  transform: ${({ active }) => (active ? "translateY(5px)" : "none")};
  transition: transform 70ms ease, box-shadow 70ms ease, background 70ms ease;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 3px solid #3b82f6;
    outline-offset: 2px;
  }
`

const Message = styled.p<{ mode: BossMode }>`
  min-height: 22px;
  margin: 0;
  color: ${({ mode }) => (mode === "watching" ? "#c2413b" : "#59667b")};
  font-size: 14px;
  font-weight: 900;
  text-align: center;
`

const Help = styled.p`
  margin: 12px 4px 0;
  color: #78859a;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
  text-align: center;
`

type HotState = {
  elapsedMs: number
  lastFrame: number
  uiTimerMs: number
  progress: number
  score: number
  escapes: number
  streak: number
  catches: number
  mode: BossMode
  modeRemainMs: number
  caughtThisLook: boolean
  shakeMs: number
  successMs: number
  runTimeMs: number
}

const createHotState = (): HotState => ({
  elapsedMs: 0,
  lastFrame: 0,
  uiTimerMs: 0,
  progress: 0,
  score: 0,
  escapes: 0,
  streak: 0,
  catches: 0,
  mode: "safe",
  modeRemainMs: 2400,
  caughtThisLook: false,
  shakeMs: 0,
  successMs: 0,
  runTimeMs: 0,
})

const safeMessages = [
  "상사가 메신저 보는 중… 지금이다!",
  "시선 반대편 확인. 조용히 전진!",
  "퇴근은 타이밍이다. 꾹 눌러 이동!",
]

const caughtMessages = [
  "딱 하나만 더 하고 가시죠.",
  "지금 가시게요? 잠깐 회의 가능하세요?",
  "벌써요? 이거 금방 끝나요.",
  "메일 하나만 확인하고 가실래요?",
]

const escapeMessages = [
  "퇴근 성공! 아무도 못 봤다.",
  "문이 닫힙니다. 완벽한 탈출!",
  "칼퇴는 기술이다.",
  "오늘도 회사보다 빨랐다.",
]

const pick = (items: string[]) =>
  items[Math.floor(Math.random() * items.length)]
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawOffice(
  ctx: CanvasRenderingContext2D,
  state: HotState,
  holding: boolean,
  phase: Phase,
  reducedMotion: boolean
) {
  const w = CANVAS_WIDTH
  const h = CANVAS_HEIGHT
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.save()

  if (!reducedMotion && state.shakeMs > 0) {
    const strength = state.shakeMs / 180
    ctx.translate((Math.random() - 0.5) * 8 * strength, 0)
  }

  const wall = ctx.createLinearGradient(0, 0, 0, 260)
  wall.addColorStop(0, "#f5efe4")
  wall.addColorStop(1, "#e8decd")
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, w, 260)
  ctx.fillStyle = "#c8b491"
  ctx.fillRect(0, 258, w, 5)

  ctx.fillStyle = "#ccb890"
  ctx.fillRect(0, 263, w, h - 263)
  ctx.strokeStyle = "rgba(108, 83, 48, 0.13)"
  ctx.lineWidth = 1
  for (let y = 263; y < h; y += 42) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  for (let x = 0; x < w; x += 84) {
    ctx.beginPath()
    ctx.moveTo(x, 263)
    ctx.lineTo(x, h)
    ctx.stroke()
  }

  const sky = ctx.createLinearGradient(0, 28, 0, 132)
  sky.addColorStop(0, "#7894c9")
  sky.addColorStop(0.58, "#f3a77e")
  sky.addColorStop(1, "#ffcf83")
  roundedRect(ctx, 28, 28, 230, 108, 8)
  ctx.fillStyle = sky
  ctx.fill()
  ctx.save()
  roundedRect(ctx, 28, 28, 230, 108, 8)
  ctx.clip()
  ctx.fillStyle = "rgba(255, 238, 180, 0.92)"
  ctx.beginPath()
  ctx.arc(206, 76, 19, 0, Math.PI * 2)
  ctx.fill()
  const buildings = [
    [30, 90, 33, 46],
    [65, 104, 40, 32],
    [108, 80, 28, 56],
    [138, 97, 48, 39],
    [190, 109, 42, 27],
    [233, 86, 25, 50],
  ]
  ctx.fillStyle = "#536177"
  buildings.forEach(([x, y, width, height]) =>
    ctx.fillRect(x, y, width, height)
  )
  ctx.restore()
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 6
  ctx.strokeRect(28, 28, 230, 108)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(143, 30)
  ctx.lineTo(143, 134)
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(332, 76, 31, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#4d596d"
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.strokeStyle = "#253047"
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(332, 76)
  ctx.lineTo(332, 55)
  ctx.moveTo(332, 76)
  ctx.lineTo(348, 76)
  ctx.stroke()
  ctx.fillStyle = "#d54b43"
  ctx.beginPath()
  ctx.arc(332, 76, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = "800 12px sans-serif"
  ctx.textAlign = "center"
  ctx.fillStyle = "#825248"
  ctx.fillText("5:59", 332, 121)

  ctx.fillStyle = "#e8f4e7"
  ctx.fillRect(682, 80, 62, 183)
  ctx.strokeStyle = "#587561"
  ctx.lineWidth = 5
  ctx.strokeRect(682, 80, 62, 183)
  ctx.fillStyle = "#315a40"
  ctx.fillRect(687, 88, 52, 27)
  ctx.fillStyle = "#ffffff"
  ctx.font = "900 13px sans-serif"
  ctx.fillText("EXIT", 713, 107)
  ctx.fillStyle = "#dbaa45"
  ctx.beginPath()
  ctx.arc(693, 173, 4, 0, Math.PI * 2)
  ctx.fill()

  if (state.mode === "watching") {
    const cone = ctx.createLinearGradient(590, 155, 68, 320)
    cone.addColorStop(0, "rgba(239, 68, 68, 0.34)")
    cone.addColorStop(1, "rgba(239, 68, 68, 0.04)")
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(589, 151)
    ctx.lineTo(42, 260)
    ctx.lineTo(42, 372)
    ctx.lineTo(589, 178)
    ctx.closePath()
    ctx.fill()
  }

  const deskXs = [155, 315, 475]
  deskXs.forEach((x, index) => {
    ctx.fillStyle = "#7b5236"
    roundedRect(ctx, x - 54, 212, 108, 50, 5)
    ctx.fill()
    ctx.fillStyle = "#9c6a45"
    ctx.fillRect(x - 58, 209, 116, 10)
    ctx.fillStyle = "#4b3a31"
    ctx.fillRect(x - 45, 262, 7, 36)
    ctx.fillRect(x + 38, 262, 7, 36)
    ctx.fillStyle = index === 1 ? "#445a68" : "#3c485b"
    roundedRect(ctx, x - 25, 174, 50, 34, 4)
    ctx.fill()
    ctx.fillStyle = index === 1 ? "#bbecf5" : "#b9cae0"
    ctx.fillRect(x - 20, 179, 40, 24)
    ctx.fillStyle = "#2d3442"
    ctx.fillRect(x - 3, 208, 6, 8)
    ctx.fillStyle = "#f7f0df"
    ctx.fillRect(x + 30, 199, 14, 10)
  })

  ctx.fillStyle = "#70462e"
  roundedRect(ctx, 552, 188, 94, 74, 6)
  ctx.fill()
  ctx.fillStyle = "#99623f"
  ctx.fillRect(548, 185, 102, 11)

  const bossX = 598
  const bossY = 146
  ctx.fillStyle = "#2c3e63"
  roundedRect(ctx, bossX - 22, bossY + 20, 44, 52, 12)
  ctx.fill()
  ctx.fillStyle = "#f0bd91"
  ctx.beginPath()
  ctx.arc(bossX, bossY, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#35322f"
  ctx.beginPath()
  ctx.arc(bossX, bossY - 7, 24, Math.PI, Math.PI * 2)
  ctx.lineTo(bossX + 22, bossY - 1)
  ctx.lineTo(bossX - 22, bossY - 1)
  ctx.fill()
  ctx.strokeStyle = "#263047"
  ctx.lineWidth = 3
  if (state.mode === "safe") {
    ctx.beginPath()
    ctx.moveTo(bossX + 8, bossY + 1)
    ctx.lineTo(bossX + 15, bossY + 1)
    ctx.stroke()
  } else if (state.mode === "warning") {
    ctx.fillStyle = "#db8b17"
    ctx.font = "900 34px sans-serif"
    ctx.fillText("!", bossX - 38, bossY - 18)
    ctx.beginPath()
    ctx.moveTo(bossX - 15, bossY + 1)
    ctx.lineTo(bossX - 7, bossY + 1)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(bossX - 10, bossY + 1, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = "#b91c1c"
    ctx.fill()
    ctx.strokeStyle = "#6b2c2c"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bossX - 18, bossY - 7)
    ctx.lineTo(bossX - 6, bossY - 10)
    ctx.stroke()
  }

  const playerX = 56 + state.progress * 608
  const bob =
    holding && phase === "running" ? Math.sin(state.runTimeMs / 80) * 2 : 0
  const crouch = !holding && phase === "running" ? 11 : 0
  const playerY = 326 + crouch + bob
  ctx.fillStyle = "rgba(40, 31, 25, 0.18)"
  ctx.beginPath()
  ctx.ellipse(playerX, 357, holding ? 18 : 22, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#2e6f68"
  roundedRect(ctx, playerX - 15, playerY - 28, 30, holding ? 35 : 27, 9)
  ctx.fill()
  ctx.fillStyle = "#efbd8f"
  ctx.beginPath()
  ctx.arc(playerX, playerY - 40, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#303135"
  ctx.beginPath()
  ctx.arc(playerX, playerY - 45, 16, Math.PI, Math.PI * 2)
  ctx.lineTo(playerX + 14, playerY - 39)
  ctx.lineTo(playerX - 14, playerY - 39)
  ctx.fill()
  ctx.fillStyle = "#e7c35c"
  roundedRect(ctx, playerX + 11, playerY - 8, 21, 18, 3)
  ctx.fill()
  ctx.strokeStyle = "#765f2d"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(playerX + 21, playerY - 8, 6, Math.PI, 0)
  ctx.stroke()

  if (state.successMs > 0) {
    const alpha = clamp(state.successMs / 800, 0, 1)
    ctx.globalAlpha = alpha
    ctx.fillStyle = "#fff4a8"
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 + state.runTimeMs / 350
      const radius = 24 + (1 - alpha) * 24
      ctx.beginPath()
      ctx.arc(
        713 + Math.cos(angle) * radius,
        220 + Math.sin(angle) * radius,
        4,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

const OfficeEscape: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const phaseRef = React.useRef<Phase>("idle")
  const holdingRef = React.useRef(false)
  const hotRef = React.useRef<HotState>(createHotState())
  const reducedMotionRef = React.useRef(false)

  const [phase, setPhase] = React.useState<Phase>("idle")
  const [holding, setHoldingState] = React.useState(false)
  const [timeLeft, setTimeLeft] = React.useState(60)
  const [score, setScore] = React.useState(0)
  const [escapes, setEscapes] = React.useState(0)
  const [catches, setCatches] = React.useState(0)
  const [progress, setProgress] = React.useState(0)
  const [bossMode, setBossMode] = React.useState<BossMode>("safe")
  const [message, setMessage] = React.useState("상사가 안 볼 때만 움직이세요.")
  const [bestScore, setBestScore] = React.useState(0)
  const [bestEscapes, setBestEscapes] = React.useState(0)

  const syncUi = React.useCallback((state: HotState) => {
    setTimeLeft(
      Math.max(0, Math.ceil((GAME_DURATION_MS - state.elapsedMs) / 1000))
    )
    setScore(state.score)
    setEscapes(state.escapes)
    setCatches(state.catches)
    setProgress(state.progress)
    setBossMode(state.mode)
  }, [])

  const stopHolding = React.useCallback(() => {
    holdingRef.current = false
    setHoldingState(false)
  }, [])

  const finishGame = React.useCallback(() => {
    const state = hotRef.current
    phaseRef.current = "over"
    setPhase("over")
    stopHolding()
    syncUi(state)
    setMessage(
      state.escapes > 0
        ? `${state.escapes}번이나 탈출! 내일도 칼퇴 가능.`
        : "퇴근 실패… 하지만 야근보다 재도전이 짧아요."
    )

    try {
      const nextBestScore = Math.max(
        state.score,
        Number(localStorage.getItem(BEST_SCORE_KEY) || "0")
      )
      const nextBestEscapes = Math.max(
        state.escapes,
        Number(localStorage.getItem(BEST_ESCAPES_KEY) || "0")
      )
      localStorage.setItem(BEST_SCORE_KEY, String(nextBestScore))
      localStorage.setItem(BEST_ESCAPES_KEY, String(nextBestEscapes))
      setBestScore(nextBestScore)
      setBestEscapes(nextBestEscapes)
    } catch {}
  }, [stopHolding, syncUi])

  const startGame = React.useCallback(() => {
    const next = createHotState()
    hotRef.current = next
    phaseRef.current = "running"
    holdingRef.current = false
    setPhase("running")
    setHoldingState(false)
    setTimeLeft(60)
    setScore(0)
    setEscapes(0)
    setCatches(0)
    setProgress(0)
    setBossMode("safe")
    setMessage("상사가 메신저 보는 중… 지금이다!")
    canvasRef.current?.focus()
  }, [])

  const startHolding = React.useCallback(() => {
    if (phaseRef.current !== "running") return
    holdingRef.current = true
    setHoldingState(true)
  }, [])

  React.useEffect(() => {
    try {
      setBestScore(Number(localStorage.getItem(BEST_SCORE_KEY) || "0"))
      setBestEscapes(Number(localStorage.getItem(BEST_ESCAPES_KEY) || "0"))
    } catch {}
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  }, [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "ArrowRight") return
      event.preventDefault()
      if (event.repeat) return
      if (phaseRef.current === "idle" || phaseRef.current === "over") {
        startGame()
        startHolding()
        return
      }
      startHolding()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "ArrowRight") return
      event.preventDefault()
      stopHolding()
    }
    const onBlur = () => stopHolding()
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [startGame, startHolding, stopHolding])

  React.useEffect(() => {
    let animationFrame = 0

    const beginBossMode = (state: HotState, mode: BossMode) => {
      const difficulty = Math.min(state.escapes, 8)
      state.mode = mode
      if (mode === "safe") {
        state.modeRemainMs = Math.max(
          1250,
          1800 + Math.random() * 1500 - difficulty * 65
        )
        state.caughtThisLook = false
        setMessage(pick(safeMessages))
      } else if (mode === "warning") {
        state.modeRemainMs = Math.max(520, 760 - difficulty * 24)
        setMessage("낌새가 이상하다… 지금 손 떼!")
      } else {
        state.modeRemainMs = 900 + Math.random() * 320
        state.caughtThisLook = false
        setMessage(
          holdingRef.current ? "앗, 눈 마주쳤다!" : "완벽한 업무 몰입 연기 중…"
        )
      }
      setBossMode(mode)
    }

    const step = (now: number) => {
      const canvas = canvasRef.current
      const state = hotRef.current

      if (phaseRef.current === "running") {
        if (state.lastFrame === 0) state.lastFrame = now
        const dtMs = Math.min(50, Math.max(0, now - state.lastFrame))
        state.lastFrame = now
        state.elapsedMs += dtMs
        state.runTimeMs += dtMs
        state.uiTimerMs += dtMs
        state.modeRemainMs -= dtMs
        state.shakeMs = Math.max(0, state.shakeMs - dtMs)
        state.successMs = Math.max(0, state.successMs - dtMs)

        if (state.modeRemainMs <= 0) {
          beginBossMode(
            state,
            state.mode === "safe"
              ? "warning"
              : state.mode === "warning"
              ? "watching"
              : "safe"
          )
        }

        if (holdingRef.current && state.mode !== "watching") {
          const speed = 0.00015 + Math.min(state.escapes, 10) * 0.000004
          state.progress += dtMs * speed
          state.score += Math.max(1, Math.round(dtMs * 0.018))
        }

        if (
          holdingRef.current &&
          state.mode === "watching" &&
          !state.caughtThisLook
        ) {
          state.caughtThisLook = true
          state.progress = Math.max(0, state.progress - 0.18)
          state.score = Math.max(0, state.score - 75)
          state.streak = 0
          state.catches += 1
          state.shakeMs = 180
          setMessage(pick(caughtMessages))
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(70)
          }
        }

        if (state.progress >= 1) {
          state.progress = 0
          state.escapes += 1
          state.streak += 1
          state.score += 400 + state.streak * 60
          state.successMs = 800
          setMessage(pick(escapeMessages))
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([25, 35, 25])
          }
        }

        if (state.uiTimerMs >= 90) {
          state.uiTimerMs = 0
          syncUi(state)
        }

        if (state.elapsedMs >= GAME_DURATION_MS) finishGame()
      } else {
        state.lastFrame = now
        state.runTimeMs += 16
      }

      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          drawOffice(
            ctx,
            state,
            holdingRef.current,
            phaseRef.current,
            reducedMotionRef.current
          )
        }
      }
      animationFrame = window.requestAnimationFrame(step)
    }

    animationFrame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [finishGame, syncUi])

  const controlPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
    startHolding()
  }

  const controlPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault()
    stopHolding()
  }

  const modeLabel =
    bossMode === "safe"
      ? "안전 · 이동!"
      : bossMode === "warning"
      ? "주의 · 손 떼!"
      : "정지 · 들킨다!"

  return (
    <Wrapper>
      <GameHeader>
        <Heading>
          <h1>퇴근 1분 전</h1>
          <p>상사의 눈을 피해 출구까지 몰래 이동하세요.</p>
        </Heading>
        <BestBadge>
          최고 {bestScore.toLocaleString()}점 · {bestEscapes}퇴근
        </BestBadge>
      </GameHeader>

      <GameCard>
        <Stats aria-label="게임 기록">
          <Stat>
            <span>남은 시간</span>
            <strong>{timeLeft}초</strong>
          </Stat>
          <Stat>
            <span>점수</span>
            <strong>{score.toLocaleString()}</strong>
          </Stat>
          <Stat>
            <span>퇴근 성공</span>
            <strong>{escapes}회</strong>
          </Stat>
          <Stat>
            <span>붙잡힘</span>
            <strong>{catches}회</strong>
          </Stat>
        </Stats>

        <StatusBar>
          <StatusPill mode={bossMode}>{modeLabel}</StatusPill>
          <ProgressTrack
            aria-label={`출구까지 ${Math.round(progress * 100)}퍼센트`}
          >
            <ProgressFill progress={progress} />
          </ProgressTrack>
        </StatusBar>

        <CanvasWrap>
          <Canvas
            ref={canvasRef}
            width={CANVAS_WIDTH * CANVAS_SCALE}
            height={CANVAS_HEIGHT * CANVAS_SCALE}
            role="img"
            tabIndex={0}
            aria-label="상사의 시선을 피해 출구로 이동하는 사무실 게임 화면"
            onPointerDown={controlPointerDown}
            onPointerUp={controlPointerUp}
            onPointerCancel={controlPointerUp}
          />
          {phase !== "running" && (
            <Overlay>
              <OverlayCard>
                {phase === "idle" ? (
                  <>
                    <h2>들키지 말고 칼퇴하세요</h2>
                    <p>
                      버튼을 누르는 동안 출구로 이동해요.
                      <br />
                      상사가 돌아보려 하면 손을 떼고 일하는 척!
                    </p>
                    <PrimaryButton type="button" onClick={startGame}>
                      몰래 퇴근 시작
                    </PrimaryButton>
                  </>
                ) : (
                  <>
                    <h2>
                      {escapes > 0 ? `${escapes}번 퇴근 성공!` : "야근 확정…"}
                    </h2>
                    <p>
                      최종 {score.toLocaleString()}점 · 상사에게 {catches}번
                      붙잡힘
                      <br />한 번 더 하면 더 조용히 갈 수 있을 것 같은데요?
                    </p>
                    <PrimaryButton type="button" onClick={startGame}>
                      다시 몰래 나가기
                    </PrimaryButton>
                  </>
                )}
              </OverlayCard>
            </Overlay>
          )}
        </CanvasWrap>

        <Controls>
          <HoldButton
            type="button"
            active={holding}
            disabled={phase !== "running"}
            aria-label="누르는 동안 출구로 이동"
            onPointerDown={controlPointerDown}
            onPointerUp={controlPointerUp}
            onPointerCancel={controlPointerUp}
            onContextMenu={event => event.preventDefault()}
          >
            {holding ? "몰래 이동 중… 손 뗄 준비!" : "꾹 눌러서 출구로 이동"}
          </HoldButton>
          <Message mode={bossMode} aria-live="polite">
            {message}
          </Message>
        </Controls>
      </GameCard>

      <Help>
        PC에서는 스페이스바 또는 → 키를 꾹 누르세요. 화면이나 버튼을 직접 눌러도
        움직여요. 상사의 빨간 시선이 나오기 전에 손을 떼면 안전합니다.
      </Help>
    </Wrapper>
  )
}

export default OfficeEscape
