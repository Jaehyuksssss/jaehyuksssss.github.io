import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "@emotion/styled"

type Phase = "idle" | "preview" | "play" | "success" | "fail"
type Difficulty = "intermediate" | "advanced"

type Props = {
  // Preview time to memorize the path (ms)
  previewMs?: number
  // Starting grid size (e.g., 3 for 3x3)
  startGrid?: number
  // Max grid size to grow to
  maxGrid?: number
  // Time-attack limit for the play phase (seconds)
  timeLimitSec?: number
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 16px 36px;
`

const Panel = styled.div`
  display: flex;
  gap: 10px 16px;
  align-items: center;
  justify-content: center;
  color: #1f2937;
  font-weight: 700;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
`

const Stat = styled.span`
  color: #1f2937;
  background: #fff3bf;
  padding: 2px 8px;
  border-radius: 8px;
`

const Board = styled.div<{ cols: number }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ cols }) => cols}, 1fr);
  gap: 18px;
  width: min(520px, 92vw);
  aspect-ratio: 1 / 1; /* keep square */
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);
`

const Dot = styled.button<{ variant?: "default" | "start" | "end" | "next" | "active" }>`
  border: none;
  background: ${({ variant }) =>
    variant === "start"
      ? "#10b981" // green
      : variant === "end"
      ? "#ef4444" // red
      : variant === "next"
      ? "#60a5fa" // blue (next target hint)
      : variant === "active"
      ? "#0ea5e9" // cyan (last clicked)
      : "#d1d5db"};
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  box-shadow: ${({ variant }) =>
    variant && variant !== "default"
      ? "0 6px 16px rgba(0,0,0,0.20)"
      : "inset 0 2px 4px rgba(0,0,0,0.08)"};
  cursor: pointer;
  transition: transform 0.06s ease, background 0.15s ease, box-shadow 0.15s ease;
  &:active { transform: scale(0.96); }
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
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
  user-select: none;
  pointer-events: auto;
`

const SecondaryBtn = styled.button`
  border: 1px solid #3a3a3a;
  background: white;
  color: #1b1b1b;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  pointer-events: auto;
`

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function idxToRC(i: number, cols: number) {
  return { r: Math.floor(i / cols), c: i % cols }
}

function rcToIdx(r: number, c: number, cols: number) {
  return r * cols + c
}

function neighbors(i: number, cols: number, rows: number) {
  const { r, c } = idxToRC(i, cols)
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
        out.push(rcToIdx(rr, cc, cols))
      }
    }
  }
  return out
}

// Self-avoiding path generator of a target length
function generatePath(cols: number, length: number, tries = 50): number[] {
  const total = cols * cols
  length = Math.max(2, Math.min(length, total))
  for (let t = 0; t < tries; t++) {
    const used = new Set<number>()
    const path: number[] = []
    let cur = randInt(0, total - 1)
    path.push(cur)
    used.add(cur)
    while (path.length < length) {
      const nbrs = neighbors(cur, cols, cols).filter(n => !used.has(n))
      if (!nbrs.length) break
      cur = nbrs[randInt(0, nbrs.length - 1)]
      path.push(cur)
      used.add(cur)
    }
    if (path.length === length) return path
  }
  // Fallback: best-effort short path
  const used = new Set<number>()
  const path: number[] = []
  let cur = 0
  path.push(cur)
  used.add(cur)
  while (path.length < length) {
    const nbrs = neighbors(cur, cols, cols).filter(n => !used.has(n))
    if (!nbrs.length) break
    cur = nbrs[0]
    path.push(cur)
    used.add(cur)
  }
  return path
}

function lengthForGrid(g: number) {
  // Baseline difficulty: 3x3 -> 6, 4x4 -> 8, 5x5 -> 9, ...
  return Math.max(2, Math.min(g * g, g + 2 + Math.floor(g / 2)))
}

const TraceRunner: React.FC<Props> = ({
  previewMs = 3000,
  startGrid = 3,
  maxGrid = 6,
  timeLimitSec = 60,
}) => {
  const [level, setLevel] = useState(1)
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate")
  const [showDiffModal, setShowDiffModal] = useState(false)
  const grid = useMemo(
    () => Math.min(maxGrid, Math.max(3, startGrid + level - 1)),
    [level, startGrid, maxGrid]
  )
  const [phase, setPhase] = useState<Phase>("idle")
  const [path, setPath] = useState<number[]>([])
  const [user, setUser] = useState<number[]>([])
  const [active, setActive] = useState<number | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitSec * 1000)
  const endAtRef = useRef<number | null>(null)
  const remainingRef = useRef<number>(remainingMs)
  const [showHint, setShowHint] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(3)
  useEffect(() => {
    remainingRef.current = remainingMs
  }, [remainingMs])

  const lenAdjustForDifficulty = useCallback((d: Difficulty) => {
    // intermediate: -1, advanced: +1
    return d === "advanced" ? 1 : -1
  }, [])

  const startLevel = useCallback(() => {
    const len = lengthForGrid(grid) + lenAdjustForDifficulty(difficulty)
    const p = generatePath(grid, len)
    setPath(p)
    setUser([])
    setPhase("preview")
    setActive(null)
    setRemainingMs(timeLimitSec * 1000)
    setShowHint(false)
    setHintsLeft(difficulty === "intermediate" ? Number.POSITIVE_INFINITY : 3)
  }, [grid, timeLimitSec, lenAdjustForDifficulty, difficulty])

  const startWithDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d)
    setShowDiffModal(false)
    // start immediately with chosen difficulty
    const len = lengthForGrid(grid) + lenAdjustForDifficulty(d)
    const p = generatePath(grid, len)
    setPath(p)
    setUser([])
    setPhase("preview")
    setActive(null)
    setRemainingMs(timeLimitSec * 1000)
    setShowHint(false)
    setHintsLeft(d === "intermediate" ? Number.POSITIVE_INFINITY : 3)
  }, [grid, timeLimitSec, lenAdjustForDifficulty])

  // Preview timer → play phase
  useEffect(() => {
    if (phase !== "preview") return
    const id = setTimeout(() => setPhase("play"), previewMs)
    return () => clearTimeout(id)
  }, [phase, previewMs])

  // When play starts, pre-fill the starting node as already entered (all modes)
  useEffect(() => {
    if (phase !== "play") return
    if (user.length > 0) return
    if (path.length === 0) return
    setUser([path[0]])
    setActive(path[0])
  }, [phase, user.length, path])

  const submitAttempt = useCallback(() => {
    // Freeze remaining time at the moment of submit
    const remain = endAtRef.current
      ? Math.max(0, endAtRef.current - performance.now())
      : remainingRef.current
    setRemainingMs(remain)
    // Compare with target path
    const ok =
      user.length === path.length && user.every((v, idx) => v === path[idx])
    setPhase(ok ? "success" : "fail")
  }, [user, path])

  // Start/stop the play timer (60s time-attack)
  useEffect(() => {
    if (phase !== "play") return
    // Use whatever time is currently remaining to (re)start the timer
    endAtRef.current = performance.now() + (remainingRef.current || timeLimitSec * 1000)
    const tick = () => {
      const end = endAtRef.current
      if (!end) return
      const remain = Math.max(0, end - performance.now())
      setRemainingMs(remain)
      if (remain <= 0) {
        // Auto-submit when time is up
        submitAttempt()
      }
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [phase, timeLimitSec, submitAttempt])

  // Measure board
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      setSize({ w: rect.width, h: rect.height })
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    setSize({ w: rect.width, h: rect.height })
    return () => ro.disconnect()
  }, [grid])

  const pts = useMemo(() => {
    const cols = grid
    const rows = grid
    const cellW = size.w / cols
    const cellH = size.h / rows
    const arr: { x: number; y: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({ x: c * cellW + cellW / 2, y: r * cellH + cellH / 2 })
      }
    }
    return arr
  }, [size, grid])

  // Longest correct prefix length (for hinting in fail state)
  const prefixLen = useMemo(() => {
    const L = Math.min(user.length, path.length)
    let n = 0
    for (; n < L; n++) {
      if (user[n] !== path[n]) break
    }
    return n
  }, [user, path])

  // Intermediate mode: how many blue dots (excluding start/end) are needed/clicked
  const blueTarget = useMemo(() => {
    if (difficulty !== "intermediate") return 0
    return Math.max(0, path.length > 1 ? path.length - 2 : 0)
  }, [difficulty, path.length])

  const blueClicked = useMemo(() => {
    if (difficulty !== "intermediate") return 0
    if (user.length === 0) return 0
    const endIdx = path[path.length - 1]
    let cnt = Math.max(0, user.length - 1) // exclude start
    if (user.includes(endIdx)) cnt = Math.max(0, cnt - 1) // don't count end as blue
    return Math.min(cnt, blueTarget)
  }, [difficulty, user, path, blueTarget])

  const triggerHint = useCallback(() => {
    setHintsLeft(prev => {
      // Unlimited in intermediate (easy) mode
      if (difficulty === "intermediate") {
        setShowHint(true)
        setUser(path.length > 0 ? [path[0]] : [])
        setActive(null)
        if (phase === "fail") setPhase("play")
        setTimeout(() => setShowHint(false), 1000)
        return prev
      }
      if (prev <= 0) return prev
      setShowHint(true)
      // In advanced, also keep start pre-filled
      setUser(path.length > 0 ? [path[0]] : [])
      setActive(null)
      if (phase === "fail") setPhase("play")
      setTimeout(() => setShowHint(false), 1000)
      return prev - 1
    })
  }, [phase, difficulty, path])

  const onDotClick = (i: number) => {
    if (phase !== "play") return
    // First click must be the true start of the path to avoid
    // building a seemingly correct but shifted pattern
    if (user.length === 0 && i !== path[0]) return
    // If clicking an already selected dot:
    const idxInUser = user.indexOf(i)
    if (idxInUser >= 0) {
      // If it's the last one, toggle (go back one step)
      if (idxInUser === user.length - 1) {
        const nextUser = user.slice(0, -1)
        setUser(nextUser)
        setActive(nextUser.length ? nextUser[nextUser.length - 1] : null)
      } else {
        // Backtrack to that dot (truncate to that index)
        const nextUser = user.slice(0, idxInUser + 1)
        setUser(nextUser)
        setActive(i)
      }
      return
    }

    if (user.length >= path.length) return
    // During play, don't reveal correctness immediately.
    // Allow only adjacent moves from the last clicked node; ignore others.
    if (user.length > 0) {
      const last = user[user.length - 1]
      const nbrs = neighbors(last, grid, grid)
      if (!nbrs.includes(i)) return
    }
    setUser(prev => [...prev, i])
    setActive(i)
  }

  

  const resetAll = useCallback(() => {
    setLevel(1)
    setPhase("idle")
    setPath([])
    setUser([])
    setActive(null)
  }, [])

  const continueNext = useCallback(() => {
    // Compute next level/grid immediately to generate the new path now
    setLevel(prev => {
      const nextLevel = prev + 1
      const nextGrid = Math.min(maxGrid, Math.max(3, startGrid + nextLevel - 1))
      const len = lengthForGrid(nextGrid) + lenAdjustForDifficulty(difficulty)
      const p = generatePath(nextGrid, len)
      // Reset state for the new level and jump straight to preview
      setPath(p)
      setUser([])
      setActive(null)
      setShowHint(false)
      setHintsLeft(difficulty === "intermediate" ? Number.POSITIVE_INFINITY : 3)
      setRemainingMs(timeLimitSec * 1000)
      setPhase("preview")
      return nextLevel
    })
  }, [maxGrid, startGrid, timeLimitSec, lenAdjustForDifficulty, difficulty])

  return (
    <Wrapper>
      <h1 style={{ color: "#1b1b1b", margin: 0 }}>연결 연결</h1>
      <Panel>
        <span >
          레벨: <Stat>{level}</Stat>
        </span>
       
        <span>
          난이도: <Stat>{difficulty === "advanced" ? "어려움" : "쉬움"}</Stat>
        </span>
        {phase === "play" ? (
          <span>
            타이머: <Stat>{Math.ceil(remainingMs / 1000)}s</Stat>
          </span>
        ) : null}
        {difficulty === "intermediate" && path.length > 0 ? (
          <span>
            파란점: <Stat>{blueClicked}/{blueTarget}</Stat>
          </span>
        ) : null}
        {/* <span>
          단계: <Stat>{phase === "idle" ? "대기" : phase === "preview" ? "미리보기" : phase === "play" ? "플레이" : phase === "success" ? "성공" : "실패"}</Stat>
        </span> */}
      </Panel>

      {/* 간단 안내 */}
      <div style={{ color: "#374151", fontWeight: 600, textAlign: "center" }}>
        {Math.round(previewMs / 1000)}초 동안 경로가 표시. 초록색에서 시작해 빨간색에서 끝나도록
        같은 순서로 점을 눌러 연결하세요.(근처 점으로만 연결 가능)
      </div>

      <Board cols={grid} ref={boardRef}>
        {/* SVG lines */}
<svg
  viewBox={`0 0 ${Math.max(size.w, 1)} ${Math.max(size.h, 1)}`}
  width="100%"
  height="100%"
  style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
>
  {/* Draw path */}
  {((): React.ReactNode => {
    const seq = (phase === "preview" || showHint)
      ? path
      : (phase === "play" ? user : [])
    return seq.map((p, idx, arr) => {
      if (idx === 0) return null
      const a = pts[arr[idx - 1]]
      const b = pts[p]
      if (!a || !b) return null
      return (
        <line
          key={`pre-${idx}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={phase === "preview" || showHint ? "#60a5fa" : "#10b981"}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.9}
        />
      )
    })
  })()}
</svg>

        {/* Dots */}
        {new Array(grid * grid).fill(null).map((_, i) => {
          const startIdx = path[0]
          const endIdx = path[path.length - 1]
          let variant: "default" | "start" | "end" | "next" | "active" = "default"
          if (phase === "preview") {
            if (i === startIdx) variant = "start"
            else if (i === endIdx) variant = "end"
          } else if (phase === "play") {
            // 쉬움(intermediate): 시작/끝 항상 표시 + 클릭한 점 파란색
            // 어려움(advanced): 시작은 항상 표시, 끝은 완성 시에만 빨강 표시
            const clickedIdx = user.indexOf(i)
            if (difficulty === "intermediate") {
              if (i === startIdx) variant = "start"
              else if (i === endIdx) variant = "end"
              if (clickedIdx >= 0) {
                if (clickedIdx === 0) variant = "start"
                else if (i === endIdx) variant = "end"
                else variant = "active"
              }
            } else {
              // advanced
              if (i === startIdx) variant = "start"
              const completed = user.length === path.length && user[user.length - 1] === endIdx
              if (completed && i === endIdx) variant = "end"
              if (clickedIdx >= 0) {
                if (clickedIdx === 0) variant = "start"
                else if (completed && i === endIdx) variant = "end"
                else variant = "active"
              }
            }
          } else {
            if (i === startIdx) variant = "start"
            if (i === endIdx) variant = "end"
            // When showing hint, answer path overlays via SVG; keep dots minimal
          }
          return (
            <Dot
              key={i}
              type="button"
              onClick={() => onDotClick(i)}
              variant={variant}
              aria-label={`dot-${i}`}
            />
          )
        })}
      </Board>

      {phase === "idle" ? (
        <PrimaryBtn
          type="button"
          onClick={() => setShowDiffModal(true)}
          aria-label={level > 1 ? `${level}단계 시작` : "게임 시작"}
        >
          {level > 1 ? `${level}단계 시작` : "게임 시작"}
        </PrimaryBtn>
      ) : phase === "preview" ? (
        <span style={{ color: "#1b1b1b" }}>경로를 기억하세요! ({Math.round(previewMs/1000)}초)</span>
      ) : phase === "play" ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 2 }}>
          <span style={{ color: "#1b1b1b" }}>순서대로 점을 연결하세요</span>
          <div style={{ display: "flex", gap: 10 }}> 
             <SecondaryBtn type="button" onClick={triggerHint} disabled={difficulty === "intermediate" ? false : hintsLeft <= 0} aria-label={difficulty === "intermediate" ? "힌트 무제한" : `힌트 보기 남은 ${hintsLeft}회`}>
            힌트{`(${difficulty === "intermediate" ? "계속 가능" : Math.max(0, hintsLeft)})`}
          </SecondaryBtn>
          <PrimaryBtn type="button" onClick={submitAttempt} aria-label="제출">제출</PrimaryBtn>
          <SecondaryBtn
            type="button"
            onClick={() => {
              if (path.length > 0) {
                setUser([path[0]])
                setActive(path[0])
              } else {
                setUser([])
                setActive(null)
              }
            }}
            aria-label="지우기"
          >
            지우기
          </SecondaryBtn>
          </div>
        </div>
      ) : null}

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#4b5563", fontWeight: 700 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#10b981", display: "inline-block" }} />
          시작점
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#ef4444", display: "inline-block" }} />
          끝점
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#0ea5e9", display: "inline-block" }} />
          선택한 점
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 9999, background: "#60a5fa", display: "inline-block" }} />
          힌트
        </span>
      </div>

      {phase === "success" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trace-result-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={continueNext}
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
            onClick={e => e.stopPropagation()}
          >
            <h2 id="trace-result-title" style={{ margin: "0 0 10px", color: "#fff" }}>
              성공!
            </h2>
            <div style={{ marginBottom: 12, fontWeight: 700 }}>
              다음 레벨로 진행합니다.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <PrimaryBtn type="button" onClick={continueNext} aria-label="다음 레벨">다음 레벨</PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "fail" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trace-fail-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={() => { setUser([]); setActive(null); setShowHint(false); setPhase("idle") }}
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
            onClick={e => e.stopPropagation()}
          >
            <h2 id="trace-fail-title" style={{ margin: "0 0 10px", color: "#fff" }}>
              아쉽습니다!
            </h2>
            <div style={{ marginBottom: 12, fontWeight: 700 }}>
              {showHint ? "다음 점이 파란색으로 표시됩니다." : "아쉬워요..좌절하지 마세요"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
    
              {remainingMs > 0 ? (
                <PrimaryBtn type="button" onClick={() => { setShowHint(false); setPhase("play")  }} aria-label="계속하기">계속하기</PrimaryBtn>
              ) : (
                <PrimaryBtn type="button" onClick={resetAll } aria-label="">처음 화면 돌아가기</PrimaryBtn>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Difficulty selection modal */}
      {showDiffModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trace-diff-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3500,
          }}
          onClick={() => setShowDiffModal(false)}
        >
          <div
            style={{
              background: "#1d1d1f",
              color: "#e6e6e6",
              padding: 20,
              borderRadius: 12,
              width: "min(460px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="trace-diff-title" style={{ margin: "0 0 12px", color: "#fff" }}>
              난이도 선택
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SecondaryBtn
                type="button"
                onClick={() => startWithDifficulty("intermediate")}
                aria-label="쉬움"
              >
                쉬움 모드 — 힌트 무한
              </SecondaryBtn>
              <SecondaryBtn
                type="button"
                onClick={() => startWithDifficulty("advanced")}
                aria-label="어려움"
              >
                아주 살짝 더 어려움 모드
              </SecondaryBtn>
            </div>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default TraceRunner
