import React from "react"
import styled from "@emotion/styled"

type Team = "blue" | "red"
type Role = "keeper" | "field"
type Phase = "idle" | "countdown" | "playing" | "goal" | "over"
type SoundKind = "kick" | "pass" | "tackle" | "whistle" | "goal"
type Difficulty = "neighborhood" | "pro" | "world"

type DifficultySettings = {
  label: string
  description: string
  opponentRunMultiplier: number
  opponentTackleRadius: number
  opponentTackleContact: number
  opponentTackleCooldownMs: number
  opponentTackleSpeed: number
  blueControlShieldMs: number
  playerShotMultiplier: number
  opponentShotMultiplier: number
  blueKeeperSpeed: number
  redKeeperSpeed: number
  blueKeeperCatchDistance: number
  redKeeperCatchDistance: number
  redKeeperPickupPadding: number
  shotTargetInset: number
}

type Player = {
  id: number
  team: Team
  role: Role
  number: number
  name: string
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
  facingX: number
  facingY: number
  radius: number
  tackleMs: number
  tackleCooldownMs: number
  decisionMs: number
  keeperHoldMs: number
}

type Ball = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  ownerId: number | null
  noPickupMs: number
  controlShieldMs: number
  lastTouch: Team | null
  trail: Array<{ x: number; y: number; alpha: number }>
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

type MatchState = {
  players: Player[]
  ball: Ball
  blueScore: number
  redScore: number
  remainingMs: number
  phaseTimeMs: number
  activeId: number
  switchTimerMs: number
  uiTimerMs: number
  lastFrame: number
  runTimeMs: number
  shakeMs: number
  flashMs: number
  particles: Particle[]
}

type KickRequest = {
  kind: "pass" | "shot"
  charge: number
} | null

const FIELD_WIDTH = 960
const FIELD_HEIGHT = 600
const CANVAS_SCALE = 2
const MATCH_DURATION_MS = 90_000
const PITCH = { left: 50, right: 910, top: 48, bottom: 552 }
const GOAL = { top: 228, bottom: 372 }
const BEST_GOALS_KEY = "three_on_three_best_goals"
const WINS_KEY = "three_on_three_wins"

const DIFFICULTY_ORDER: Difficulty[] = ["neighborhood", "pro", "world"]

const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  neighborhood: {
    label: "동네축구",
    description: "공을 여유 있게 지키고 시원하게 골을 넣어요.",
    opponentRunMultiplier: 0.84,
    opponentTackleRadius: 30,
    opponentTackleContact: 27,
    opponentTackleCooldownMs: 1500,
    opponentTackleSpeed: 250,
    blueControlShieldMs: 850,
    playerShotMultiplier: 1.08,
    opponentShotMultiplier: 0.88,
    blueKeeperSpeed: 160,
    redKeeperSpeed: 120,
    blueKeeperCatchDistance: 39,
    redKeeperCatchDistance: 31,
    redKeeperPickupPadding: -1,
    shotTargetInset: 11,
  },
  pro: {
    label: "프로경기",
    description: "공격과 수비가 균형 잡힌 정석 승부예요.",
    opponentRunMultiplier: 1,
    opponentTackleRadius: 34,
    opponentTackleContact: 31,
    opponentTackleCooldownMs: 1120,
    opponentTackleSpeed: 300,
    blueControlShieldMs: 620,
    playerShotMultiplier: 1,
    opponentShotMultiplier: 1,
    blueKeeperSpeed: 148,
    redKeeperSpeed: 148,
    blueKeeperCatchDistance: 36,
    redKeeperCatchDistance: 36,
    redKeeperPickupPadding: 3,
    shotTargetInset: 16,
  },
  world: {
    label: "월드클래스",
    description: "강한 압박과 빠른 선방을 뚫어야 해요.",
    opponentRunMultiplier: 1.13,
    opponentTackleRadius: 39,
    opponentTackleContact: 34,
    opponentTackleCooldownMs: 860,
    opponentTackleSpeed: 335,
    blueControlShieldMs: 430,
    playerShotMultiplier: 0.97,
    opponentShotMultiplier: 1.1,
    blueKeeperSpeed: 138,
    redKeeperSpeed: 170,
    blueKeeperCatchDistance: 34,
    redKeeperCatchDistance: 42,
    redKeeperPickupPadding: 9,
    shotTargetInset: 23,
  },
}

const difficultyStorageKey = (base: string, difficulty: Difficulty) =>
  `${base}_${difficulty}`

const Wrapper = styled.section`
  width: min(1020px, 100%);
  margin: 0 auto;
  padding: 8px 8px 48px;
  color: #f8fafc;
`

const Header = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: 0 4px 14px;

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
`

const Brand = styled.div`
  h1 {
    margin: 0;
    color: #12213f;
    font-family: Arial, Helvetica, sans-serif;
    font-size: clamp(29px, 6vw, 48px);
    font-style: italic;
    font-weight: 950;
    letter-spacing: -2.5px;
    line-height: 0.95;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    font-weight: 800;
  }
`

const Record = styled.div`
  padding: 8px 12px;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: #ffffff;
  color: #53627a;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 7px 20px rgba(27, 40, 69, 0.08);
`

const GameFrame = styled.div`
  overflow: hidden;
  border: 1px solid rgba(26, 39, 67, 0.24);
  border-radius: 22px;
  background: #111a2c;
  box-shadow: 0 24px 60px rgba(19, 31, 57, 0.28);
`

const Scoreboard = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 66px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, #17233b 0%, #10192c 100%);
  font-family: Arial, Helvetica, sans-serif;
`

const TeamScore = styled.div<{ side: "home" | "away" }>`
  display: flex;
  align-items: center;
  justify-content: ${({ side }) =>
    side === "home" ? "flex-start" : "flex-end"};
  gap: 10px;

  span {
    color: ${({ side }) => (side === "home" ? "#6ee7ff" : "#ff8b78")};
    font-size: clamp(11px, 2.8vw, 16px);
    font-weight: 900;
    letter-spacing: 0.8px;
  }

  strong {
    min-width: 30px;
    color: #ffffff;
    font-size: clamp(26px, 6vw, 38px);
    font-weight: 950;
    text-align: center;
  }
`

const MatchClock = styled.div`
  min-width: 74px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: #0a1120;
  color: #ffffff;
  font-size: clamp(15px, 4vw, 20px);
  font-weight: 900;
  letter-spacing: 1px;
  text-align: center;
`

const CanvasShell = styled.div`
  position: relative;
  background: #0d1629;
`

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: ${FIELD_WIDTH} / ${FIELD_HEIGHT};
  outline: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;

  &:focus-visible {
    box-shadow: inset 0 0 0 4px #7dd3fc;
  }
`

const Announcement = styled.div<{ kind?: "goal" | "countdown" }>`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;

  strong {
    color: ${({ kind }) => (kind === "goal" ? "#ffe66d" : "#ffffff")};
    font-family: Arial, Helvetica, sans-serif;
    font-size: clamp(46px, 12vw, 108px);
    font-style: italic;
    font-weight: 950;
    letter-spacing: -4px;
    line-height: 1;
    text-shadow: 0 5px 0 rgba(9, 17, 32, 0.55),
      0 0 30px rgba(255, 230, 109, 0.4);
    transform: rotate(-3deg);
  }
`

const StartOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(6, 13, 27, 0.76);
  backdrop-filter: blur(4px);

  @media (max-width: 480px) {
    padding: 6px;
  }
`

const StartCard = styled.div`
  width: min(580px, 96%);
  padding: clamp(13px, 2.4vw, 22px);
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 18px;
  background: rgba(17, 28, 50, 0.96);
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.38);

  h2 {
    margin: 0 0 6px;
    color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: clamp(22px, 5vw, 34px);
    font-weight: 950;
  }

  @media (max-width: 480px) {
    padding: 9px;
    border-radius: 12px;

    h2 {
      margin-bottom: 3px;
      font-size: 19px;
    }
  }
`

const StartCopy = styled.p`
  margin: 0 0 clamp(8px, 1.8vw, 14px);
  color: #bdc9dd;
  font-size: clamp(11px, 2.1vw, 13px);
  font-weight: 700;
  line-height: 1.55;

  @media (max-width: 480px) {
    margin-bottom: 5px;
    font-size: 10px;
    line-height: 1.35;
  }
`

const DifficultyPicker = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 8px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  background: rgba(5, 12, 25, 0.52);

  @media (max-width: 480px) {
    margin-bottom: 4px;
    padding: 3px;
  }
`

const DifficultyButton = styled.button<{ selected: boolean }>`
  min-width: 0;
  padding: 10px 5px 9px;
  border: 1px solid
    ${({ selected }) =>
      selected ? "rgba(255, 255, 255, 0.38)" : "transparent"};
  border-radius: 8px;
  background: ${({ selected }) =>
    selected ? "rgba(255, 255, 255, 0.1)" : "transparent"};
  color: ${({ selected }) => (selected ? "#ffffff" : "#73839d")};
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(11px, 2.2vw, 14px);
  font-weight: 900;
  letter-spacing: -0.2px;
  box-shadow: ${({ selected }) =>
    selected ? "inset 0 -2px 0 rgba(255, 255, 255, 0.9)" : "none"};
  transform: ${({ selected }) => (selected ? "translateY(-1px)" : "none")};
  transition: color 140ms ease, border-color 140ms ease, background 140ms ease,
    transform 140ms ease;

  &:hover {
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    padding: 6px 2px;
    font-size: 11px;
  }
`

const DifficultyNote = styled.p`
  min-height: 18px;
  margin: 0 0 clamp(8px, 1.8vw, 13px);
  color: #9cabc1;
  font-size: clamp(10px, 1.9vw, 12px);
  font-weight: 700;
  line-height: 1.45;

  @media (max-width: 480px) {
    min-height: 13px;
    margin-bottom: 4px;
    font-size: 9px;
    line-height: 1.3;
  }
`

const StartButton = styled.button`
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: clamp(10px, 2.2vw, 13px) 18px;
  background: linear-gradient(135deg, #67e8f9 0%, #3b82f6 100%);
  color: #07152d;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(14px, 3vw, 17px);
  font-weight: 950;
  box-shadow: 0 9px 24px rgba(59, 130, 246, 0.3);

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 3px solid #f8fafc;
    outline-offset: 3px;
  }

  @media (max-width: 480px) {
    padding: 8px 14px;
    font-size: 12px;
  }
`

const TouchPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr);
  align-items: center;
  gap: 16px;
  min-height: 138px;
  padding: 14px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, #121d32 0%, #0d1628 100%);

  @media (max-width: 560px) {
    grid-template-columns: 1fr auto;
    gap: 10px;
    min-height: 122px;
    padding: 10px 14px;
  }
`

const Joystick = styled.div`
  position: relative;
  width: 104px;
  height: 104px;
  justify-self: start;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(95, 118, 154, 0.34) 0%,
    rgba(37, 54, 82, 0.3) 68%
  );
  box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.24);
  touch-action: none;
  user-select: none;

  &::before,
  &::after {
    position: absolute;
    background: rgba(255, 255, 255, 0.08);
    content: "";
  }

  &::before {
    top: 50%;
    left: 15px;
    width: 74px;
    height: 1px;
  }

  &::after {
    top: 15px;
    left: 50%;
    width: 1px;
    height: 74px;
  }
`

const JoystickKnob = styled.div<{ x: number; y: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 48px;
  height: 48px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: linear-gradient(145deg, #5d7193 0%, #34445f 100%);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  transform: translate(
    calc(-50% + ${({ x }) => x * 32}px),
    calc(-50% + ${({ y }) => y * 32}px)
  );
  pointer-events: none;
`

const CenterInfo = styled.div`
  min-width: 160px;
  text-align: center;

  span {
    display: block;
    color: #70809b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: #dce8f8;
    font-size: 13px;
    font-weight: 900;
  }

  @media (max-width: 560px) {
    display: none;
  }
`

const ActionArea = styled.div`
  display: grid;
  justify-items: end;
  gap: 8px;
`

const KickButton = styled.button<{ charging: boolean }>`
  width: 102px;
  height: 102px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  background: ${({ charging }) =>
    charging
      ? "linear-gradient(145deg, #ffb14a 0%, #ef4444 100%)"
      : "linear-gradient(145deg, #67e8f9 0%, #3478f6 100%)"};
  color: #071428;
  cursor: pointer;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 17px;
  font-weight: 950;
  box-shadow: ${({ charging }) =>
    charging
      ? "inset 0 5px 12px rgba(126, 32, 24, 0.28), 0 0 24px rgba(255, 117, 65, 0.3)"
      : "0 8px 0 #2059b7, 0 13px 24px rgba(0, 0, 0, 0.32)"};
  transform: ${({ charging }) =>
    charging ? "translateY(6px) scale(0.96)" : "none"};
  transition: transform 80ms ease, box-shadow 80ms ease, background 120ms ease;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;

  &:disabled {
    cursor: default;
    filter: grayscale(0.65);
    opacity: 0.55;
  }

  &:focus-visible {
    outline: 3px solid #ffffff;
    outline-offset: 3px;
  }
`

const ChargeTrack = styled.div`
  width: 102px;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
`

const ChargeFill = styled.div<{ charge: number }>`
  width: ${({ charge }) => Math.max(0, Math.min(1, charge)) * 100}%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #67e8f9 0%, #fde047 62%, #fb5b45 100%);
  transition: width 40ms linear;
`

const UtilityButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: rgba(6, 14, 28, 0.64);
  color: #ffffff;
  cursor: pointer;
  font-size: 16px;
  backdrop-filter: blur(4px);
`

const Help = styled.p`
  margin: 12px 6px 0;
  color: #738198;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.65;
  text-align: center;
`

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const normalize = (x: number, y: number) => {
  const length = Math.hypot(x, y)
  if (length < 0.001) return { x: 0, y: 0 }
  return { x: x / length, y: y / length }
}

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

const createPlayer = (
  id: number,
  team: Team,
  role: Role,
  number: number,
  name: string,
  x: number,
  y: number
): Player => ({
  id,
  team,
  role,
  number,
  name,
  x,
  y,
  homeX: x,
  homeY: y,
  vx: 0,
  vy: 0,
  facingX: team === "blue" ? 1 : -1,
  facingY: 0,
  radius: role === "keeper" ? 16 : 17,
  tackleMs: 0,
  tackleCooldownMs: 0,
  decisionMs: 500 + Math.random() * 400,
  keeperHoldMs: 0,
})

const createPlayers = () => [
  createPlayer(0, "blue", "keeper", 1, "루프", 92, 300),
  createPlayer(1, "blue", "field", 7, "제트", 294, 205),
  createPlayer(2, "blue", "field", 10, "노바", 294, 395),
  createPlayer(3, "red", "keeper", 1, "록", 868, 300),
  createPlayer(4, "red", "field", 9, "블레이즈", 666, 205),
  createPlayer(5, "red", "field", 11, "바이퍼", 666, 395),
]

const createMatchState = (): MatchState => ({
  players: createPlayers(),
  ball: {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 8,
    ownerId: null,
    noPickupMs: 700,
    controlShieldMs: 0,
    lastTouch: null,
    trail: [],
  },
  blueScore: 0,
  redScore: 0,
  remainingMs: MATCH_DURATION_MS,
  phaseTimeMs: 3000,
  activeId: 1,
  switchTimerMs: 0,
  uiTimerMs: 0,
  lastFrame: 0,
  runTimeMs: 0,
  shakeMs: 0,
  flashMs: 0,
  particles: [],
})

function resetKickoff(state: MatchState) {
  state.players = createPlayers()
  state.ball = {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 8,
    ownerId: null,
    noPickupMs: 650,
    controlShieldMs: 0,
    lastTouch: null,
    trail: [],
  }
  state.activeId = 1
  state.switchTimerMs = 0
}

function addBurst(
  state: MatchState,
  x: number,
  y: number,
  colors: string[],
  count: number,
  power: number
) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = power * (0.35 + Math.random() * 0.65)
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 350 + Math.random() * 450,
      maxLife: 800,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    })
  }
}

function updateParticles(state: MatchState, dt: number, dtMs: number) {
  state.particles.forEach(particle => {
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.vx *= Math.pow(0.15, dt)
    particle.vy *= Math.pow(0.15, dt)
    particle.life -= dtMs
  })
  state.particles = state.particles.filter(particle => particle.life > 0)
  state.ball.trail.forEach(point => {
    point.alpha -= dt * 2.8
  })
  state.ball.trail = state.ball.trail.filter(point => point.alpha > 0)
}

function drawMatch(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  phase: Phase,
  charging: boolean,
  charge: number,
  reducedMotion: boolean
) {
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
  ctx.save()

  if (!reducedMotion && state.shakeMs > 0) {
    const power = state.shakeMs / 260
    ctx.translate(
      (Math.random() - 0.5) * 11 * power,
      (Math.random() - 0.5) * 7 * power
    )
  }

  const stadium = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT)
  stadium.addColorStop(0, "#0b1324")
  stadium.addColorStop(0.5, "#17223a")
  stadium.addColorStop(1, "#08101f")
  ctx.fillStyle = stadium
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)

  for (let side = 0; side < 2; side += 1) {
    const y = side === 0 ? 8 : 568
    for (let x = 16; x < FIELD_WIDTH - 10; x += 13) {
      const palette = ["#6ee7ff", "#f8fafc", "#ff8b78", "#facc15", "#7c8daf"]
      ctx.fillStyle = palette[(Math.floor(x / 13) + side * 2) % palette.length]
      ctx.globalAlpha = 0.45 + ((x * 7) % 10) / 30
      ctx.beginPath()
      ctx.arc(x, y + ((x * 11) % 17), 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1

  roundedRect(ctx, 34, 32, 892, 536, 18)
  ctx.fillStyle = "#173d2b"
  ctx.fill()
  ctx.strokeStyle = "rgba(145, 255, 192, 0.18)"
  ctx.lineWidth = 2
  ctx.stroke()

  for (let x = PITCH.left; x < PITCH.right; x += 86) {
    ctx.fillStyle =
      Math.floor((x - PITCH.left) / 86) % 2 === 0 ? "#23834d" : "#207a48"
    ctx.fillRect(x, PITCH.top, 86, PITCH.bottom - PITCH.top)
  }

  const glow = ctx.createRadialGradient(480, 300, 60, 480, 300, 520)
  glow.addColorStop(0, "rgba(141, 255, 188, 0.12)")
  glow.addColorStop(1, "rgba(5, 34, 21, 0.16)")
  ctx.fillStyle = glow
  ctx.fillRect(
    PITCH.left,
    PITCH.top,
    PITCH.right - PITCH.left,
    PITCH.bottom - PITCH.top
  )

  ctx.strokeStyle = "rgba(238, 255, 244, 0.86)"
  ctx.lineWidth = 3
  ctx.strokeRect(
    PITCH.left,
    PITCH.top,
    PITCH.right - PITCH.left,
    PITCH.bottom - PITCH.top
  )
  ctx.beginPath()
  ctx.moveTo(480, PITCH.top)
  ctx.lineTo(480, PITCH.bottom)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(480, 300, 72, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = "rgba(238, 255, 244, 0.9)"
  ctx.beginPath()
  ctx.arc(480, 300, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeRect(PITCH.left, 174, 142, 252)
  ctx.strokeRect(PITCH.right - 142, 174, 142, 252)
  ctx.strokeRect(PITCH.left, 236, 58, 128)
  ctx.strokeRect(PITCH.right - 58, 236, 58, 128)
  ctx.beginPath()
  ctx.arc(155, 300, 4, 0, Math.PI * 2)
  ctx.arc(805, 300, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.strokeStyle = "rgba(229, 239, 255, 0.8)"
  ctx.lineWidth = 2
  ctx.fillStyle = "rgba(218, 232, 247, 0.12)"
  ctx.fillRect(16, GOAL.top, 34, GOAL.bottom - GOAL.top)
  ctx.fillRect(910, GOAL.top, 34, GOAL.bottom - GOAL.top)
  ctx.strokeRect(16, GOAL.top, 34, GOAL.bottom - GOAL.top)
  ctx.strokeRect(910, GOAL.top, 34, GOAL.bottom - GOAL.top)
  ctx.globalAlpha = 0.34
  for (let y = GOAL.top + 12; y < GOAL.bottom; y += 14) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(50, y)
    ctx.moveTo(910, y)
    ctx.lineTo(944, y)
    ctx.stroke()
  }
  ctx.restore()

  const keeperOwner = state.players.find(
    player => player.id === state.ball.ownerId && player.role === "keeper"
  )
  if (keeperOwner) {
    const isBlueKeeper = keeperOwner.team === "blue"
    const areaX = isBlueKeeper ? PITCH.left : PITCH.right - 174
    ctx.fillStyle = isBlueKeeper
      ? "rgba(103, 232, 249, 0.12)"
      : "rgba(255, 139, 120, 0.12)"
    ctx.fillRect(areaX, 160, 174, 280)
    ctx.strokeStyle = isBlueKeeper
      ? "rgba(103, 232, 249, 0.72)"
      : "rgba(255, 139, 120, 0.72)"
    ctx.lineWidth = 3
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(isBlueKeeper ? areaX + 174 : areaX, 160)
    ctx.lineTo(isBlueKeeper ? areaX + 174 : areaX, 440)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.font = "900 13px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("KEEPER BALL", areaX + 87, 150)
  }

  state.ball.trail.forEach(point => {
    ctx.globalAlpha = point.alpha * 0.4
    ctx.fillStyle = "#d8f8ff"
    ctx.beginPath()
    ctx.arc(point.x, point.y, state.ball.radius * point.alpha, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  if (charging && phase === "playing") {
    const active = state.players.find(player => player.id === state.activeId)
    if (active) {
      const length = 62 + charge * 70
      const targetX = active.facingX || 1
      const targetY = active.facingY
      ctx.strokeStyle = charge > 0.75 ? "#ffe45e" : "rgba(255,255,255,0.8)"
      ctx.lineWidth = 4 + charge * 3
      ctx.setLineDash([10, 8])
      ctx.beginPath()
      ctx.moveTo(active.x, active.y)
      ctx.lineTo(active.x + targetX * length, active.y + targetY * length)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  state.players.forEach(player => {
    const isActive =
      player.id === state.activeId &&
      player.team === "blue" &&
      player.role === "field"
    const speed = Math.hypot(player.vx, player.vy)
    const pulse = 1 + Math.sin(state.runTimeMs / 120) * 0.08

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)"
    ctx.beginPath()
    ctx.ellipse(
      player.x + 2,
      player.y + 8,
      player.radius + 4,
      player.radius * 0.55,
      0,
      0,
      Math.PI * 2
    )
    ctx.fill()

    if (isActive) {
      ctx.strokeStyle = "#fff36b"
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(player.x, player.y, (player.radius + 9) * pulse, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = "#fff36b"
      ctx.beginPath()
      ctx.moveTo(player.x, player.y - player.radius - 18)
      ctx.lineTo(player.x - 7, player.y - player.radius - 29)
      ctx.lineTo(player.x + 7, player.y - player.radius - 29)
      ctx.closePath()
      ctx.fill()
    }

    if (player.tackleMs > 0) {
      ctx.strokeStyle =
        player.team === "blue"
          ? "rgba(110,231,255,0.65)"
          : "rgba(255,139,120,0.65)"
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2)
      ctx.stroke()
    }

    const jersey = ctx.createLinearGradient(
      player.x - player.radius,
      player.y - player.radius,
      player.x + player.radius,
      player.y + player.radius
    )
    if (player.team === "blue") {
      jersey.addColorStop(0, player.role === "keeper" ? "#facc15" : "#65e7ff")
      jersey.addColorStop(1, player.role === "keeper" ? "#e39416" : "#2563eb")
    } else {
      jersey.addColorStop(0, player.role === "keeper" ? "#d8f59b" : "#ff9b82")
      jersey.addColorStop(1, player.role === "keeper" ? "#5ea64d" : "#e23c50")
    }
    ctx.fillStyle = jersey
    ctx.beginPath()
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.72)"
    ctx.lineWidth = player.role === "keeper" ? 3 : 2
    ctx.stroke()

    ctx.fillStyle = "#11203a"
    ctx.font = "900 12px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(player.number), player.x, player.y + 1)

    const facing = normalize(player.facingX, player.facingY)
    ctx.fillStyle = "rgba(255,255,255,0.95)"
    ctx.beginPath()
    ctx.arc(
      player.x + facing.x * (player.radius - 2),
      player.y + facing.y * (player.radius - 2),
      4.5,
      0,
      Math.PI * 2
    )
    ctx.fill()

    if (speed > 120) {
      ctx.strokeStyle = "rgba(255,255,255,0.28)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(
        player.x - facing.x * 22 - facing.y * 5,
        player.y - facing.y * 22 + facing.x * 5
      )
      ctx.lineTo(
        player.x - facing.x * 32 - facing.y * 5,
        player.y - facing.y * 32 + facing.x * 5
      )
      ctx.moveTo(
        player.x - facing.x * 22 + facing.y * 5,
        player.y - facing.y * 22 - facing.x * 5
      )
      ctx.lineTo(
        player.x - facing.x * 32 + facing.y * 5,
        player.y - facing.y * 32 - facing.x * 5
      )
      ctx.stroke()
    }
  })

  const ball = state.ball
  ctx.fillStyle = "rgba(0,0,0,0.25)"
  ctx.beginPath()
  ctx.ellipse(ball.x + 3, ball.y + 8, 10, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#cad4df"
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = "#263349"
  ctx.beginPath()
  ctx.arc(ball.x - 1, ball.y, 2.8, 0, Math.PI * 2)
  ctx.fill()

  state.particles.forEach(particle => {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1)
    ctx.fillStyle = particle.color
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1

  if (state.flashMs > 0) {
    ctx.globalAlpha = clamp(state.flashMs / 320, 0, 0.34)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

const ArcadeFootball: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const joystickRef = React.useRef<HTMLDivElement | null>(null)
  const phaseRef = React.useRef<Phase>("idle")
  const stateRef = React.useRef<MatchState>(createMatchState())
  const keysRef = React.useRef(new Set<string>())
  const joystickInputRef = React.useRef({ x: 0, y: 0 })
  const kickRequestRef = React.useRef<KickRequest>(null)
  const chargingRef = React.useRef(false)
  const chargeStartedAtRef = React.useRef(0)
  const mutedRef = React.useRef(false)
  const difficultyRef = React.useRef<Difficulty>("neighborhood")
  const reducedMotionRef = React.useRef(false)
  const audioRef = React.useRef<AudioContext | null>(null)

  const [phase, setPhase] = React.useState<Phase>("idle")
  const [blueScore, setBlueScore] = React.useState(0)
  const [redScore, setRedScore] = React.useState(0)
  const [timeLeft, setTimeLeft] = React.useState(90)
  const [countdown, setCountdown] = React.useState("3")
  const [goalLabel, setGoalLabel] = React.useState("GOAL!")
  const [activeName, setActiveName] = React.useState("제트 · 7")
  const [joystick, setJoystick] = React.useState({ x: 0, y: 0 })
  const [charging, setCharging] = React.useState(false)
  const [charge, setCharge] = React.useState(0)
  const [muted, setMuted] = React.useState(false)
  const [difficulty, setDifficulty] = React.useState<Difficulty>("neighborhood")
  const [bestGoals, setBestGoals] = React.useState(0)
  const [wins, setWins] = React.useState(0)

  const formatClock = (seconds: number) => {
    const safe = Math.max(0, seconds)
    const mins = Math.floor(safe / 60)
    const secs = Math.floor(safe % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const playSound = React.useCallback((kind: SoundKind) => {
    if (mutedRef.current || typeof window === "undefined") return
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext()
      }
      const audio = audioRef.current
      if (audio.state === "suspended") void audio.resume()
      const now = audio.currentTime

      const tone = (
        frequency: number,
        duration: number,
        gainValue: number,
        delay = 0
      ) => {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type =
          kind === "kick" || kind === "tackle" ? "triangle" : "sine"
        oscillator.frequency.setValueAtTime(frequency, now + delay)
        if (kind === "kick") {
          oscillator.frequency.exponentialRampToValueAtTime(
            70,
            now + delay + duration
          )
        }
        gain.gain.setValueAtTime(gainValue, now + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration)
        oscillator.connect(gain)
        gain.connect(audio.destination)
        oscillator.start(now + delay)
        oscillator.stop(now + delay + duration)
      }

      if (kind === "goal") {
        tone(392, 0.18, 0.075)
        tone(523, 0.25, 0.07, 0.12)
        tone(659, 0.38, 0.065, 0.24)
      } else if (kind === "whistle") {
        tone(1100, 0.1, 0.045)
        tone(1450, 0.12, 0.035, 0.11)
      } else if (kind === "pass") {
        tone(170, 0.07, 0.035)
      } else if (kind === "tackle") {
        tone(105, 0.08, 0.045)
      } else {
        tone(220, 0.13, 0.06)
      }
    } catch {}
  }, [])

  const syncUi = React.useCallback((state: MatchState) => {
    setBlueScore(state.blueScore)
    setRedScore(state.redScore)
    setTimeLeft(Math.max(0, Math.ceil(state.remainingMs / 1000)))
    const active = state.players.find(player => player.id === state.activeId)
    if (active) setActiveName(`${active.name} · ${active.number}`)
  }, [])

  const stopCharge = React.useCallback(() => {
    if (!chargingRef.current) return
    const duration = performance.now() - chargeStartedAtRef.current
    const power = clamp(duration / 900, 0, 1)
    if (phaseRef.current === "playing") {
      kickRequestRef.current = {
        kind: duration < 260 ? "pass" : "shot",
        charge: power,
      }
    }
    chargingRef.current = false
    setCharging(false)
    setCharge(0)
  }, [])

  const startCharge = React.useCallback(() => {
    if (phaseRef.current !== "playing" || chargingRef.current) return
    chargingRef.current = true
    chargeStartedAtRef.current = performance.now()
    setCharging(true)
  }, [])

  const startMatch = React.useCallback(() => {
    difficultyRef.current = difficulty
    const next = createMatchState()
    stateRef.current = next
    phaseRef.current = "countdown"
    kickRequestRef.current = null
    chargingRef.current = false
    keysRef.current.clear()
    joystickInputRef.current = { x: 0, y: 0 }
    setJoystick({ x: 0, y: 0 })
    setCharging(false)
    setCharge(0)
    setBlueScore(0)
    setRedScore(0)
    setTimeLeft(90)
    setCountdown("3")
    setPhase("countdown")
    canvasRef.current?.focus()
    playSound("whistle")
  }, [difficulty, playSound])

  const finishMatch = React.useCallback(() => {
    const state = stateRef.current
    phaseRef.current = "over"
    setPhase("over")
    chargingRef.current = false
    setCharging(false)
    setCharge(0)
    syncUi(state)
    playSound("whistle")

    try {
      const activeDifficulty = difficultyRef.current
      const bestKey = difficultyStorageKey(BEST_GOALS_KEY, activeDifficulty)
      const winsKey = difficultyStorageKey(WINS_KEY, activeDifficulty)
      const legacyBest =
        activeDifficulty === "pro" ? localStorage.getItem(BEST_GOALS_KEY) : null
      const legacyWins =
        activeDifficulty === "pro" ? localStorage.getItem(WINS_KEY) : null
      const previousBest = Number(
        localStorage.getItem(bestKey) ?? legacyBest ?? "0"
      )
      const nextBest = Math.max(previousBest, state.blueScore)
      let nextWins = Number(localStorage.getItem(winsKey) ?? legacyWins ?? "0")
      if (state.blueScore > state.redScore) nextWins += 1
      localStorage.setItem(bestKey, String(nextBest))
      localStorage.setItem(winsKey, String(nextWins))
      setBestGoals(nextBest)
      setWins(nextWins)
    } catch {}
  }, [playSound, syncUi])

  React.useEffect(() => {
    try {
      const bestKey = difficultyStorageKey(BEST_GOALS_KEY, difficulty)
      const winsKey = difficultyStorageKey(WINS_KEY, difficulty)
      const legacyBest =
        difficulty === "pro" ? localStorage.getItem(BEST_GOALS_KEY) : null
      const legacyWins =
        difficulty === "pro" ? localStorage.getItem(WINS_KEY) : null
      setBestGoals(Number(localStorage.getItem(bestKey) ?? legacyBest ?? "0"))
      setWins(Number(localStorage.getItem(winsKey) ?? legacyWins ?? "0"))
    } catch {}
  }, [difficulty])

  React.useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    return () => {
      try {
        void audioRef.current?.close()
      } catch {}
    }
  }, [])

  React.useEffect(() => {
    const movementCodes = new Set([
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ])
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        event.code === "Space" &&
        target instanceof HTMLElement &&
        target.closest("button")
      ) {
        return
      }
      if (movementCodes.has(event.code) || event.code === "Space")
        event.preventDefault()
      if (movementCodes.has(event.code)) keysRef.current.add(event.code)
      if (event.code !== "Space" || event.repeat) return
      if (phaseRef.current === "idle" || phaseRef.current === "over") {
        startMatch()
        return
      }
      startCharge()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (movementCodes.has(event.code) || event.code === "Space")
        event.preventDefault()
      if (movementCodes.has(event.code)) keysRef.current.delete(event.code)
      if (event.code === "Space") stopCharge()
    }
    const onBlur = () => {
      keysRef.current.clear()
      joystickInputRef.current = { x: 0, y: 0 }
      setJoystick({ x: 0, y: 0 })
      stopCharge()
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
    }
  }, [startCharge, startMatch, stopCharge])

  React.useEffect(() => {
    let animationFrame = 0

    const getInput = () => {
      let x = joystickInputRef.current.x
      let y = joystickInputRef.current.y
      const keys = keysRef.current
      if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1
      if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1
      if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1
      if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1
      return normalize(x, y)
    }

    const playerById = (state: MatchState, id: number | null) =>
      id === null ? undefined : state.players.find(player => player.id === id)

    const kickBall = (
      state: MatchState,
      owner: Player,
      targetX: number,
      targetY: number,
      speed: number,
      sound: SoundKind
    ) => {
      const direction = normalize(
        targetX - state.ball.x,
        targetY - state.ball.y
      )
      state.ball.ownerId = null
      state.ball.noPickupMs = sound === "pass" ? 130 : 210
      state.ball.controlShieldMs = 0
      state.ball.lastTouch = owner.team
      state.ball.vx = direction.x * speed
      state.ball.vy = direction.y * speed
      owner.facingX = direction.x
      owner.facingY = direction.y
      owner.decisionMs = 650
      state.shakeMs = sound === "kick" ? 80 : state.shakeMs
      addBurst(
        state,
        state.ball.x,
        state.ball.y,
        owner.team === "blue" ? ["#67e8f9", "#ffffff"] : ["#ff8b78", "#ffffff"],
        sound === "kick" ? 9 : 5,
        sound === "kick" ? 120 : 75
      )
      playSound(sound)
    }

    const closestFieldPlayer = (
      state: MatchState,
      team: Team,
      target: { x: number; y: number }
    ) =>
      state.players
        .filter(player => player.team === team && player.role === "field")
        .sort((a, b) => distance(a, target) - distance(b, target))[0]

    const setMovement = (
      player: Player,
      targetX: number,
      targetY: number,
      speed: number,
      dt: number
    ) => {
      const direction = normalize(targetX - player.x, targetY - player.y)
      const desiredVx = direction.x * speed
      const desiredVy = direction.y * speed
      const blend = clamp(dt * 7.8, 0, 1)
      player.vx += (desiredVx - player.vx) * blend
      player.vy += (desiredVy - player.vy) * blend
      if (Math.abs(direction.x) + Math.abs(direction.y) > 0.1) {
        player.facingX = direction.x
        player.facingY = direction.y
      }
    }

    const setDirectMovement = (
      player: Player,
      input: { x: number; y: number },
      speed: number,
      dt: number
    ) => {
      const blend = clamp(dt * 9.5, 0, 1)
      player.vx += (input.x * speed - player.vx) * blend
      player.vy += (input.y * speed - player.vy) * blend
      if (Math.abs(input.x) + Math.abs(input.y) > 0.1) {
        player.facingX = input.x
        player.facingY = input.y
      }
    }

    const releaseBall = (state: MatchState, owner: Player, tackler: Player) => {
      if (
        tackler.role !== "keeper" &&
        (state.ball.controlShieldMs > 0 || owner.role === "keeper")
      ) {
        return false
      }

      const keeperCatch = tackler.role === "keeper"
      state.ball.ownerId = keeperCatch ? tackler.id : null
      state.ball.lastTouch = tackler.team
      state.ball.noPickupMs = keeperCatch ? 0 : 170
      state.ball.controlShieldMs = keeperCatch ? 1250 : 0
      state.ball.x = tackler.x + tackler.facingX * 17
      state.ball.y = tackler.y + tackler.facingY * 17
      state.ball.vx = keeperCatch
        ? tackler.vx
        : tackler.facingX * 145 + owner.vx * 0.22
      state.ball.vy = keeperCatch
        ? tackler.vy
        : tackler.facingY * 145 + owner.vy * 0.22
      owner.vx *= 0.58
      owner.vy *= 0.58
      tackler.tackleCooldownMs = keeperCatch ? 450 : 1080
      if (keeperCatch) tackler.keeperHoldMs = 1250
      state.shakeMs = 85
      addBurst(state, state.ball.x, state.ball.y, ["#ffffff", "#fde047"], 7, 95)
      playSound("tackle")
      return true
    }

    const executeKickRequest = (
      state: MatchState,
      request: Exclude<KickRequest, null>,
      input: { x: number; y: number }
    ) => {
      const tuning = DIFFICULTIES[difficultyRef.current]
      const active = playerById(state, state.activeId)
      if (!active) return
      const ownsBall = state.ball.ownerId === active.id
      const canReachLooseBall =
        state.ball.ownerId === null && distance(active, state.ball) < 38

      if (ownsBall || canReachLooseBall) {
        if (request.kind === "pass") {
          const teammate = state.players
            .filter(
              player =>
                player.team === "blue" &&
                player.id !== active.id &&
                player.role === "field"
            )
            .sort((a, b) => distance(a, active) - distance(b, active))[0]
          const targetX = teammate
            ? teammate.x + teammate.vx * 0.28
            : PITCH.right
          const targetY = teammate ? teammate.y + teammate.vy * 0.28 : 300
          kickBall(state, active, targetX, targetY, 455, "pass")
        } else {
          const farPostY =
            active.y < FIELD_HEIGHT / 2
              ? GOAL.bottom - tuning.shotTargetInset
              : GOAL.top + tuning.shotTargetInset
          const manualAimY = clamp(
            300 + input.y * 124,
            GOAL.top + tuning.shotTargetInset,
            GOAL.bottom - tuning.shotTargetInset
          )
          const aimY = Math.abs(input.y) > 0.25 ? manualAimY : farPostY
          kickBall(
            state,
            active,
            956,
            aimY,
            (650 + request.charge * 320) * tuning.playerShotMultiplier,
            "kick"
          )
        }
      } else if (active.tackleCooldownMs <= 0) {
        const direction =
          Math.abs(input.x) + Math.abs(input.y) > 0.1
            ? input
            : normalize(active.facingX, active.facingY)
        active.tackleMs = 180
        active.tackleCooldownMs = 720
        active.vx = direction.x * 390
        active.vy = direction.y * 390
        playSound("tackle")
      }
    }

    const updatePlayers = (
      state: MatchState,
      dt: number,
      dtMs: number,
      input: { x: number; y: number }
    ) => {
      const tuning = DIFFICULTIES[difficultyRef.current]
      state.players.forEach(player => {
        player.tackleMs = Math.max(0, player.tackleMs - dtMs)
        player.tackleCooldownMs = Math.max(0, player.tackleCooldownMs - dtMs)
        player.decisionMs -= dtMs
      })

      state.switchTimerMs -= dtMs
      if (state.switchTimerMs <= 0) {
        const owner = playerById(state, state.ball.ownerId)
        const target = owner || state.ball
        const forcedOwner =
          owner?.team === "blue" && owner.role === "field" ? owner : undefined
        const nearest = forcedOwner || closestFieldPlayer(state, "blue", target)
        if (nearest) state.activeId = nearest.id
        state.switchTimerMs = 230
      }

      const active = playerById(state, state.activeId)
      if (active) {
        const hasBall = state.ball.ownerId === active.id
        setDirectMovement(active, input, hasBall ? 198 : 218, dt)
      }

      const ballOwner = playerById(state, state.ball.ownerId)
      const blueSupport = state.players.find(
        player =>
          player.team === "blue" &&
          player.role === "field" &&
          player.id !== state.activeId
      )
      if (blueSupport) {
        if (ballOwner?.team === "red" && ballOwner.role === "keeper") {
          setMovement(
            blueSupport,
            675,
            blueSupport.homeY < 300 ? 205 : 395,
            184,
            dt
          )
        } else if (ballOwner?.team === "blue") {
          const laneY = ballOwner.y < 300 ? 410 : 190
          setMovement(
            blueSupport,
            clamp(ballOwner.x + 125, 210, 770),
            laneY,
            158,
            dt
          )
        } else if (ballOwner?.team === "red") {
          const coverX = clamp(ballOwner.x - 115, 190, 540)
          setMovement(
            blueSupport,
            coverX,
            clamp(ballOwner.y + (ballOwner.y < 300 ? 105 : -105), 120, 480),
            166,
            dt
          )
        } else {
          setMovement(blueSupport, 350, blueSupport.homeY, 154, dt)
        }
      }

      const redFields = state.players.filter(
        player => player.team === "red" && player.role === "field"
      )
      const redChaser = redFields.sort(
        (a, b) => distance(a, state.ball) - distance(b, state.ball)
      )[0]
      redFields.forEach(player => {
        if (ballOwner?.team === "blue" && ballOwner.role === "keeper") {
          setMovement(
            player,
            285,
            player.homeY < 300 ? 205 : 395,
            184 * tuning.opponentRunMultiplier,
            dt
          )
        } else if (state.ball.ownerId === player.id) {
          const attackY = clamp(
            300 + Math.sin(state.runTimeMs / 850 + player.id) * 92,
            160,
            440
          )
          setMovement(
            player,
            82,
            attackY,
            184 * tuning.opponentRunMultiplier,
            dt
          )

          if (player.decisionMs <= 0) {
            const pressure = state.players.some(
              other => other.team === "blue" && distance(other, player) < 62
            )
            const teammate = redFields.find(other => other.id !== player.id)
            if (player.x < 300) {
              kickBall(
                state,
                player,
                4,
                clamp(
                  300 + (Math.random() - 0.5) * 100,
                  GOAL.top + 14,
                  GOAL.bottom - 14
                ),
                (600 + Math.random() * 120) * tuning.opponentShotMultiplier,
                "kick"
              )
            } else if (pressure && teammate) {
              kickBall(state, player, teammate.x - 40, teammate.y, 430, "pass")
            }
            player.decisionMs = 500 + Math.random() * 500
          }
        } else if (player.id === redChaser?.id && ballOwner?.team !== "red") {
          setMovement(
            player,
            state.ball.x,
            state.ball.y,
            166 * tuning.opponentRunMultiplier,
            dt
          )
        } else {
          const supportX =
            ballOwner?.team === "red" ? clamp(ballOwner.x - 125, 180, 690) : 620
          const supportY = player.homeY < 300 ? 190 : 410
          setMovement(
            player,
            supportX,
            supportY,
            155 * tuning.opponentRunMultiplier,
            dt
          )
        }
      })

      state.players
        .filter(player => player.role === "keeper")
        .forEach(keeper => {
          const isBlue = keeper.team === "blue"
          const owner = playerById(state, state.ball.ownerId)
          const goalX = isBlue ? 92 : 868
          const watchY = clamp(state.ball.y, GOAL.top + 24, GOAL.bottom - 24)
          const ballThreatensGoal = isBlue
            ? state.ball.x < 330
            : state.ball.x > 630
          setMovement(
            keeper,
            goalX,
            ballThreatensGoal ? watchY : 300,
            isBlue ? tuning.blueKeeperSpeed : tuning.redKeeperSpeed,
            dt
          )

          if (state.ball.ownerId === keeper.id) {
            keeper.keeperHoldMs -= dtMs
            keeper.vx *= 0.7
            keeper.vy *= 0.7
            if (keeper.keeperHoldMs <= 0) {
              const teammate = state.players
                .filter(
                  player =>
                    player.team === keeper.team && player.role === "field"
                )
                .sort((a, b) => distance(b, keeper) - distance(a, keeper))[0]
              if (teammate) {
                kickBall(
                  state,
                  keeper,
                  teammate.x + (isBlue ? 80 : -80),
                  teammate.y,
                  500,
                  "pass"
                )
              }
            }
          } else if (
            owner &&
            owner.team !== keeper.team &&
            distance(owner, keeper) <
              (isBlue
                ? tuning.blueKeeperCatchDistance
                : tuning.redKeeperCatchDistance)
          ) {
            releaseBall(state, owner, keeper)
          }
        })

      state.players.forEach(player => {
        if (player.role === "field" && player.id !== state.activeId) {
          const owner = playerById(state, state.ball.ownerId)
          if (
            owner &&
            owner.team !== player.team &&
            owner.role !== "keeper" &&
            state.ball.controlShieldMs <= 0 &&
            distance(owner, player) <
              (player.team === "red" ? tuning.opponentTackleRadius : 34) &&
            player.tackleCooldownMs <= 0
          ) {
            player.tackleMs = 140
            player.tackleCooldownMs =
              player.team === "red" ? tuning.opponentTackleCooldownMs : 1120
            const direction = normalize(owner.x - player.x, owner.y - player.y)
            const tackleSpeed =
              player.team === "red" ? tuning.opponentTackleSpeed : 300
            player.vx = direction.x * tackleSpeed
            player.vy = direction.y * tackleSpeed
          }
        }
      })

      state.players.forEach(player => {
        player.x += player.vx * dt
        player.y += player.vy * dt
        const xLimit =
          player.role === "keeper"
            ? player.team === "blue"
              ? { min: 66, max: 176 }
              : { min: 784, max: 894 }
            : { min: 70, max: 890 }
        player.x = clamp(player.x, xLimit.min, xLimit.max)
        player.y = clamp(player.y, PITCH.top + 24, PITCH.bottom - 24)
      })

      const protectedKeeper = playerById(state, state.ball.ownerId)
      if (protectedKeeper?.role === "keeper") {
        state.players.forEach(player => {
          if (player.team === protectedKeeper.team || player.role !== "field") {
            return
          }
          if (protectedKeeper.team === "red" && player.x > 720) {
            player.x = 720
            player.vx = Math.min(player.vx, -80)
          }
          if (protectedKeeper.team === "blue" && player.x < 240) {
            player.x = 240
            player.vx = Math.max(player.vx, 80)
          }
        })
      }

      for (let i = 0; i < state.players.length; i += 1) {
        for (let j = i + 1; j < state.players.length; j += 1) {
          const a = state.players[i]
          const b = state.players[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const length = Math.hypot(dx, dy) || 0.01
          const minimum = a.radius + b.radius - 2
          if (length < minimum) {
            const overlap = (minimum - length) / 2
            const nx = dx / length
            const ny = dy / length
            a.x -= nx * overlap
            a.y -= ny * overlap
            b.x += nx * overlap
            b.y += ny * overlap
          }
        }
      }

      const ownerAfterMove = playerById(state, state.ball.ownerId)
      if (ownerAfterMove) {
        state.players.forEach(player => {
          if (
            player.team !== ownerAfterMove.team &&
            player.tackleMs > 0 &&
            ownerAfterMove.role !== "keeper" &&
            state.ball.controlShieldMs <= 0 &&
            distance(player, ownerAfterMove) <
              (player.team === "red" ? tuning.opponentTackleContact : 31)
          ) {
            releaseBall(state, ownerAfterMove, player)
          }
        })
      }
    }

    const updateBall = (
      state: MatchState,
      dt: number,
      dtMs: number
    ): Team | null => {
      const tuning = DIFFICULTIES[difficultyRef.current]
      const owner = playerById(state, state.ball.ownerId)
      state.ball.noPickupMs = Math.max(0, state.ball.noPickupMs - dtMs)
      state.ball.controlShieldMs = Math.max(
        0,
        state.ball.controlShieldMs - dtMs
      )

      if (owner) {
        const controlDistance = owner.role === "keeper" ? 15 : 21
        const targetX = owner.x + owner.facingX * controlDistance
        const targetY = owner.y + owner.facingY * controlDistance
        const blend = clamp(dt * 17, 0, 1)
        state.ball.x += (targetX - state.ball.x) * blend
        state.ball.y += (targetY - state.ball.y) * blend
        state.ball.vx = owner.vx
        state.ball.vy = owner.vy
      } else {
        const speed = Math.hypot(state.ball.vx, state.ball.vy)
        state.ball.x += state.ball.vx * dt
        state.ball.y += state.ball.vy * dt
        const friction = Math.pow(0.19, dt)
        state.ball.vx *= friction
        state.ball.vy *= friction

        if (speed > 370) {
          state.ball.trail.push({ x: state.ball.x, y: state.ball.y, alpha: 1 })
          if (state.ball.trail.length > 18) state.ball.trail.shift()
        }

        if (state.ball.y < PITCH.top + state.ball.radius) {
          state.ball.y = PITCH.top + state.ball.radius
          state.ball.vy = Math.abs(state.ball.vy) * 0.76
        }
        if (state.ball.y > PITCH.bottom - state.ball.radius) {
          state.ball.y = PITCH.bottom - state.ball.radius
          state.ball.vy = -Math.abs(state.ball.vy) * 0.76
        }

        const insideGoal = state.ball.y > GOAL.top && state.ball.y < GOAL.bottom
        if (state.ball.x < PITCH.left - 4 && insideGoal) return "red"
        if (state.ball.x > PITCH.right + 4 && insideGoal) return "blue"
        if (state.ball.x < PITCH.left + state.ball.radius && !insideGoal) {
          state.ball.x = PITCH.left + state.ball.radius
          state.ball.vx = Math.abs(state.ball.vx) * 0.72
        }
        if (state.ball.x > PITCH.right - state.ball.radius && !insideGoal) {
          state.ball.x = PITCH.right - state.ball.radius
          state.ball.vx = -Math.abs(state.ball.vx) * 0.72
        }

        if (state.ball.noPickupMs <= 0) {
          const candidates = state.players
            .map(player => ({ player, d: distance(player, state.ball) }))
            .filter(item => {
              const pickupPadding =
                item.player.team === "red" && item.player.role === "keeper"
                  ? tuning.redKeeperPickupPadding
                  : 3
              return (
                item.d < item.player.radius + state.ball.radius + pickupPadding
              )
            })
            .sort((a, b) => a.d - b.d)
          const contact = candidates[0]?.player
          if (contact) {
            if (speed < 410 || contact.role === "keeper") {
              state.ball.ownerId = contact.id
              state.ball.lastTouch = contact.team
              state.ball.controlShieldMs =
                contact.role === "keeper"
                  ? 1250
                  : contact.team === "blue"
                  ? tuning.blueControlShieldMs
                  : 520
              state.ball.trail = []
              if (contact.role === "keeper") contact.keeperHoldMs = 1250
            } else {
              const normal = normalize(
                state.ball.x - contact.x,
                state.ball.y - contact.y
              )
              const dot = state.ball.vx * normal.x + state.ball.vy * normal.y
              state.ball.vx = (state.ball.vx - 1.7 * dot * normal.x) * 0.62
              state.ball.vy = (state.ball.vy - 1.7 * dot * normal.y) * 0.62
              state.ball.noPickupMs = 90
              addBurst(state, state.ball.x, state.ball.y, ["#ffffff"], 4, 60)
            }
          }
        }
      }
      return null
    }

    const celebrateGoal = (state: MatchState, team: Team) => {
      if (team === "blue") state.blueScore += 1
      else state.redScore += 1
      phaseRef.current = "goal"
      state.phaseTimeMs = 1800
      state.shakeMs = 270
      state.flashMs = 320
      state.ball.vx *= 0.15
      state.ball.vy *= 0.15
      setGoalLabel(team === "blue" ? "GOAL!" : "OH NO!")
      setPhase("goal")
      setBlueScore(state.blueScore)
      setRedScore(state.redScore)
      addBurst(
        state,
        team === "blue" ? 905 : 55,
        state.ball.y,
        team === "blue"
          ? ["#67e8f9", "#fde047", "#ffffff"]
          : ["#ff8b78", "#ffffff", "#fca5a5"],
        48,
        260
      )
      playSound("goal")
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([45, 35, 70])
      }
    }

    const step = (now: number) => {
      const state = stateRef.current
      if (state.lastFrame === 0) state.lastFrame = now
      const dtMs = Math.min(42, Math.max(0, now - state.lastFrame))
      const dt = dtMs / 1000
      state.lastFrame = now
      state.runTimeMs += dtMs
      state.shakeMs = Math.max(0, state.shakeMs - dtMs)
      state.flashMs = Math.max(0, state.flashMs - dtMs)
      updateParticles(state, dt, dtMs)

      if (phaseRef.current === "countdown") {
        state.phaseTimeMs -= dtMs
        const count = Math.max(1, Math.ceil(state.phaseTimeMs / 1000))
        setCountdown(state.phaseTimeMs > 1100 ? String(count) : "KICK OFF")
        if (state.phaseTimeMs <= 0) {
          phaseRef.current = "playing"
          setPhase("playing")
          playSound("whistle")
        }
      } else if (phaseRef.current === "playing") {
        const input = getInput()
        const request = kickRequestRef.current
        if (request) {
          executeKickRequest(state, request, input)
          kickRequestRef.current = null
        }
        updatePlayers(state, dt, dtMs, input)
        const goal = updateBall(state, dt, dtMs)
        if (goal) celebrateGoal(state, goal)
        state.remainingMs = Math.max(0, state.remainingMs - dtMs)
        if (state.remainingMs <= 0) finishMatch()
      } else if (phaseRef.current === "goal") {
        state.phaseTimeMs -= dtMs
        if (state.phaseTimeMs <= 0) {
          resetKickoff(state)
          state.phaseTimeMs = 1100
          phaseRef.current = "countdown"
          setCountdown("KICK OFF")
          setPhase("countdown")
        }
      }

      if (chargingRef.current) {
        setCharge(
          clamp((performance.now() - chargeStartedAtRef.current) / 900, 0, 1)
        )
      }

      state.uiTimerMs += dtMs
      if (state.uiTimerMs >= 100) {
        state.uiTimerMs = 0
        syncUi(state)
      }

      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (ctx) {
        drawMatch(
          ctx,
          state,
          phaseRef.current,
          chargingRef.current,
          chargingRef.current
            ? clamp(
                (performance.now() - chargeStartedAtRef.current) / 900,
                0,
                1
              )
            : 0,
          reducedMotionRef.current
        )
      }
      animationFrame = window.requestAnimationFrame(step)
    }

    animationFrame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [finishMatch, playSound, syncUi])

  const updateJoystick = (clientX: number, clientY: number) => {
    const base = joystickRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const x = (clientX - (rect.left + rect.width / 2)) / (rect.width * 0.36)
    const y = (clientY - (rect.top + rect.height / 2)) / (rect.height * 0.36)
    const length = Math.hypot(x, y)
    const limited = length > 1 ? { x: x / length, y: y / length } : { x, y }
    joystickInputRef.current = limited
    setJoystick(limited)
  }

  const joystickDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
    updateJoystick(event.clientX, event.clientY)
  }

  const joystickMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.preventDefault()
    updateJoystick(event.clientX, event.clientY)
  }

  const joystickUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    joystickInputRef.current = { x: 0, y: 0 }
    setJoystick({ x: 0, y: 0 })
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {}
  }

  const actionDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {}
    startCharge()
  }

  const actionUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    stopCharge()
  }

  const toggleMuted = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
  }

  const resultTitle =
    blueScore > redScore
      ? "승리!"
      : blueScore < redScore
      ? "아쉬운 패배"
      : "무승부"

  const difficultySelector = (
    <>
      <DifficultyPicker role="group" aria-label="경기 난이도 선택">
        {DIFFICULTY_ORDER.map(level => (
          <DifficultyButton
            key={level}
            type="button"
            selected={difficulty === level}
            aria-pressed={difficulty === level}
            onClick={() => setDifficulty(level)}
          >
            {DIFFICULTIES[level].label}
          </DifficultyButton>
        ))}
      </DifficultyPicker>
      <DifficultyNote aria-live="polite">
        {DIFFICULTIES[difficulty].description}
      </DifficultyNote>
    </>
  )

  return (
    <Wrapper>
      <Header>
        <Brand>
          <h1>THREE ON THREE</h1>
          <p>90초 안에 끝나는 탑다운 스트리트 풋볼</p>
        </Brand>
        <Record>
          {DIFFICULTIES[difficulty].label} · 최고 {bestGoals}골 · 통산 {wins}승
        </Record>
      </Header>

      <GameFrame>
        <Scoreboard aria-label="경기 점수">
          <TeamScore side="home">
            <span>NEON BLUE</span>
            <strong>{blueScore}</strong>
          </TeamScore>
          <MatchClock>{formatClock(timeLeft)}</MatchClock>
          <TeamScore side="away">
            <strong>{redScore}</strong>
            <span>RED COMETS</span>
          </TeamScore>
        </Scoreboard>

        <CanvasShell>
          <Canvas
            ref={canvasRef}
            width={FIELD_WIDTH * CANVAS_SCALE}
            height={FIELD_HEIGHT * CANVAS_SCALE}
            role="img"
            tabIndex={0}
            aria-label={`3대3 축구 경기 화면. 현재 ${blueScore}대 ${redScore}`}
          />
          <UtilityButton
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "소리 켜기" : "소리 끄기"}
            title={muted ? "소리 켜기" : "소리 끄기"}
          >
            {muted ? "×" : "♪"}
          </UtilityButton>

          {phase === "countdown" && (
            <Announcement kind="countdown" aria-live="assertive">
              <strong>{countdown}</strong>
            </Announcement>
          )}
          {phase === "goal" && (
            <Announcement kind="goal" aria-live="assertive">
              <strong>{goalLabel}</strong>
            </Announcement>
          )}
          {(phase === "idle" || phase === "over") && (
            <StartOverlay>
              <StartCard>
                {phase === "idle" ? (
                  <>
                    <h2>3대3, 90초 승부</h2>
                    <StartCopy>
                      자동으로 가장 가까운 선수를 조작해요.
                      <br />
                      짧게 누르면 패스, 길게 눌렀다 떼면 강슛!
                    </StartCopy>
                    {difficultySelector}
                    <StartButton type="button" onClick={startMatch}>
                      MATCH START
                    </StartButton>
                  </>
                ) : (
                  <>
                    <h2>{resultTitle}</h2>
                    <StartCopy>
                      최종 스코어 {blueScore} : {redScore}
                      <br />
                      다음 경기는 슛을 반 박자만 빨리 가져가 보세요.
                    </StartCopy>
                    {difficultySelector}
                    <StartButton type="button" onClick={startMatch}>
                      REMATCH
                    </StartButton>
                  </>
                )}
              </StartCard>
            </StartOverlay>
          )}
        </CanvasShell>

        <TouchPanel>
          <Joystick
            ref={joystickRef}
            role="application"
            aria-label="선수 이동 조이스틱"
            onPointerDown={joystickDown}
            onPointerMove={joystickMove}
            onPointerUp={joystickUp}
            onPointerCancel={joystickUp}
            onContextMenu={event => event.preventDefault()}
          >
            <JoystickKnob x={joystick.x} y={joystick.y} />
          </Joystick>

          <CenterInfo aria-live="polite">
            <span>CONTROL PLAYER</span>
            <strong>{activeName}</strong>
          </CenterInfo>

          <ActionArea>
            <KickButton
              type="button"
              charging={charging}
              disabled={phase !== "playing"}
              aria-label="짧게 누르면 패스, 길게 누르면 슛"
              onPointerDown={actionDown}
              onPointerUp={actionUp}
              onPointerCancel={actionUp}
              onContextMenu={event => event.preventDefault()}
            >
              {charging ? "SHOOT!" : "PASS"}
            </KickButton>
            <ChargeTrack
              aria-label={`슛 파워 ${Math.round(charge * 100)}퍼센트`}
            >
              <ChargeFill charge={charge} />
            </ChargeTrack>
          </ActionArea>
        </TouchPanel>
      </GameFrame>

      <Help>
        이동: WASD·방향키 또는 조이스틱 · 패스: 스페이스 짧게 · 슛: 스페이스를
        길게 눌렀다 떼기 · 공이 없을 때 버튼을 누르면 태클합니다.
      </Help>
    </Wrapper>
  )
}

export default ArcadeFootball
