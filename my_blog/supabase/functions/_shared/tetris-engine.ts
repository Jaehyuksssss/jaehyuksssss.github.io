// Shared by the browser and the score verifier. No clocks, DOM, or unseeded RNG.
export const RULESET = 'marathon-v1'
export const WIDTH = 10, HEIGHT = 22, HIDDEN = 2, HZ = 60
export const MAX_TICKS = HZ * 60 * 120
export const KEY = { left: 1, right: 2, down: 4, cw: 8, ccw: 16, drop: 32, hold: 64 } as const
export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
export type Handling = { das: number; arr: number; soft: number }
export const DEFAULT_HANDLING: Handling = { das: 10, arr: 3, soft: 2 }
export type Piece = { kind: Kind; x: number; y: number; rotation: number }
export type ReplayEvent = [number, number]
export type State = {
  board: number[][]; active: Piece; queue: Kind[]; hold: Kind | null; held: boolean
  seed: number; score: number; lines: number; level: number; tick: number; over: boolean
  previous: number; direction: number; repeat: number; gravity: number; lock: number; resets: number
  rotated: boolean; combo: number; backToBack: boolean; pieces: number; clearRows: number[]
  clearTick: number; message: string
}
const SHAPES: Record<Kind, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]], T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]], Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]], L: [[0,0,1],[1,1,1],[0,0,0]],
}
// SRS offsets, using screen coordinates (positive y points down).
const JLSTZ: Record<string, number[][]> = {
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
}
const I_KICKS: Record<string, number[][]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
}
export function cells(piece: Piece): number[][] {
  let matrix = SHAPES[piece.kind]
  for (let r = 0; r < piece.rotation; r++) matrix = matrix[0].map((_, x) => matrix.map(row => row[x]).reverse())
  return matrix.flatMap((row, y) => row.flatMap((v, x) => v ? [[x + piece.x, y + piece.y]] : []))
}
export function fits(s: State, p: Piece): boolean {
  return cells(p).every(([x,y]) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && !s.board[y][x])
}
function random(s: State): number {
  let x = s.seed >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5
  s.seed = x >>> 0
  return s.seed / 4294967296
}
function refill(s: State) {
  while (s.queue.length < 7) {
    const bag = [...KINDS]
    for (let i = 6; i > 0; i--) { const j = Math.floor(random(s) * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] }
    s.queue.push(...bag)
  }
}
function spawn(s: State, kind?: Kind) {
  refill(s)
  const next = kind ?? s.queue.shift()!
  s.active = { kind: next, x: next === 'O' ? 4 : 3, y: 0, rotation: 0 }
  refill(s); s.gravity = 0; s.lock = 0; s.resets = 0; s.rotated = false
  if (!fits(s, s.active)) s.over = true
}
export function createGame(seed: number): State {
  const s: State = {
    board: Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0)),
    active: { kind: 'T', x: 3, y: 0, rotation: 0 }, queue: [], hold: null, held: false,
    seed: (seed >>> 0) || 1, score: 0, lines: 0, level: 1, tick: 0, over: false,
    previous: 0, direction: 0, repeat: 0, gravity: 0, lock: 0, resets: 0,
    rotated: false, combo: -1, backToBack: false, pieces: 0, clearRows: [], clearTick: -100, message: '',
  }
  spawn(s); return s
}
function grounded(s: State) { return !fits(s, { ...s.active, y: s.active.y + 1 }) }
function resetLock(s: State, wasGrounded: boolean) {
  if (wasGrounded && s.resets < 15) { s.lock = 0; s.resets++ }
}
export function move(s: State, dx: number): boolean {
  const p = { ...s.active, x: s.active.x + dx }, wasGrounded = grounded(s)
  if (!fits(s,p)) return false
  s.active = p; s.rotated = false; resetLock(s,wasGrounded); return true
}
export function rotate(s: State, direction: number): boolean {
  if (s.active.kind === 'O') return false
  const before = s.active.rotation, after = (before + direction + 4) % 4
  const offsets = (s.active.kind === 'I' ? I_KICKS : JLSTZ)[before + '>' + after]
  const wasGrounded = grounded(s)
  for (const [dx,dy] of offsets) {
    const p = { ...s.active, x: s.active.x + dx, y: s.active.y + dy, rotation: after }
    if (fits(s,p)) { s.active = p; s.rotated = true; resetLock(s,wasGrounded); return true }
  }
  return false
}
export function ghost(s: State): Piece {
  const p = { ...s.active }
  while (fits(s, { ...p, y: p.y + 1 })) p.y++
  return p
}
function lockPiece(s: State) {
  const p = s.active, blocks = cells(p)
  const occupied = (x: number,y: number) => x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || !!s.board[y][x]
  const spin = p.kind === 'T' && s.rotated && [[0,0],[2,0],[0,2],[2,2]].filter(([x,y]) => occupied(p.x+x,p.y+y)).length >= 3
  for (const [x,y] of blocks) s.board[y][x] = KINDS.indexOf(p.kind) + 1
  const rows = s.board.flatMap((r,i) => r.every(Boolean) ? [i] : [])
  const n = rows.length, difficult = n > 0 && (n === 4 || spin)
  let base = spin ? [400,800,1200,1600][n] : [0,100,300,500,800][n]
  if (difficult && s.backToBack) base = Math.floor(base * 1.5)
  if (n) {
    s.combo++; s.score += (base + Math.max(0,s.combo) * 50) * s.level
    s.backToBack = difficult; s.lines += n; s.level = Math.floor(s.lines / 10) + 1
    s.board = s.board.filter((_,i) => !rows.includes(i))
    while (s.board.length < HEIGHT) s.board.unshift(Array(WIDTH).fill(0))
    s.clearRows = rows; s.clearTick = s.tick
    s.message = (spin ? 'T-SPIN ' : '') + (n === 4 ? 'TETRIS' : ['', 'SINGLE', 'DOUBLE', 'TRIPLE'][n]) + (s.combo > 0 ? ` · ${s.combo} COMBO` : '')
  } else { s.combo = -1; s.score += base * s.level }
  s.pieces++; s.held = false
  if (blocks.every(([,y]) => y < HIDDEN) && !n) { s.over = true; return }
  spawn(s)
}
export function validHandling(h: unknown): h is Handling {
  if (!h || typeof h !== 'object') return false
  const v = h as Handling
  return Number.isInteger(v.das) && v.das >= 5 && v.das <= 18 && Number.isInteger(v.arr) && v.arr >= 1 && v.arr <= 6 && Number.isInteger(v.soft) && v.soft >= 1 && v.soft <= 6
}
export function step(s: State, mask: number, h: Handling = DEFAULT_HANDLING): void {
  if (s.over) return
  const pressed = mask & ~s.previous; s.previous = mask; s.tick++
  if (pressed & KEY.hold && !s.held) {
    const previous = s.hold; s.hold = s.active.kind; spawn(s, previous ?? undefined); s.held = true
    if (s.over) return
  }
  const direction = (mask & KEY.left ? -1 : 0) + (mask & KEY.right ? 1 : 0)
  if (direction !== s.direction) { s.direction = direction; s.repeat = 0; if (direction) move(s,direction) }
  else if (direction && ++s.repeat >= h.das && (s.repeat - h.das) % h.arr === 0) move(s,direction)
  if (pressed & KEY.cw) rotate(s,1)
  else if (pressed & KEY.ccw) rotate(s,-1)
  if (pressed & KEY.drop) {
    const landing = ghost(s); s.score += (landing.y - s.active.y) * 2; s.active = landing; lockPiece(s)
    if (s.tick >= MAX_TICKS) s.over = true
    return
  }
  const interval = Math.max(1, Math.floor(60 * Math.pow(0.8, s.level - 1)))
  s.gravity++
  if (s.gravity >= (mask & KEY.down ? Math.min(interval,h.soft) : interval)) {
    s.gravity = 0
    if (!grounded(s)) { s.active.y++; if (mask & KEY.down) s.score++; }
  }
  if (grounded(s) && ++s.lock >= 30) lockPiece(s)
  if (s.tick >= MAX_TICKS) s.over = true
}
export function replay(seed: number, events: ReplayEvent[], ticks: number, handling: Handling): State {
  if (!validHandling(handling) || !Number.isInteger(ticks) || ticks < 1 || ticks > MAX_TICKS || !Array.isArray(events) || events.length > 80000) throw new Error('Invalid replay')
  let previous = -1
  for (const e of events) {
    if (!Array.isArray(e) || e.length !== 2 || !Number.isInteger(e[0]) || e[0] <= previous || e[0] >= ticks || !Number.isInteger(e[1]) || e[1] < 0 || e[1] > 127) throw new Error('Invalid input')
    previous = e[0]
  }
  const s = createGame(seed); let index = 0, mask = 0
  for (let tick = 0; tick < ticks; tick++) {
    if (s.over) throw new Error('Input after game over')
    if (index < events.length && events[index][0] === tick) mask = events[index++][1]
    step(s,mask,handling)
  }
  if (!s.over) throw new Error('Unfinished game')
  return s
}
