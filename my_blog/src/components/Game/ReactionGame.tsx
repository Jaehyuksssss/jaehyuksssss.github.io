import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from '@emotion/styled'

type Props = {
  // Time-attack limit in seconds (always 30 by request)
  timeLimitSec?: number
  // Starting grid size (NxN). Increases by +1 each round: 2,3,4...
  initialGrid?: number
}

type Difficulty = 'easy' | 'medium' | 'hard'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 16px 40px;
`

const Panel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  justify-content: center;
  color: #e6e6e6;
  font-weight: 700;
`

const Stat = styled.span`
  color: #ffd561;
`

const Board = styled.div<{ cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ cols }) => cols}, minmax(0, 1fr));
  gap: 10px;
  width: min(560px, 92vw);
  margin-top: 8px;
`

const Tile = styled.button`
  aspect-ratio: 1 / 1;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2) inset, 0 3px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform 0.06s ease;
  &:active { transform: scale(0.98); }
`

const PrimaryBtn = styled.button`
  border: none;
  background: #ffd561;
  color: #111;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
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

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function colorPair(difficulty: Difficulty) {
  const h = randInt(0, 359)
  const s = randInt(68, 90)
  const l = randInt(42, 58)

  if (difficulty === 'hard') {
    const delta = randInt(9, 15) * (Math.random() < 0.5 ? -1 : 1)
    const l2 = Math.max(20, Math.min(85, l + delta))
    return {
      base: `hsl(${h} ${s}% ${l}%)`,
      target: `hsl(${h} ${s}% ${l2}%)`,
    }
  }

  if (difficulty === 'medium') {
    const delta = randInt(18, 26) * (Math.random() < 0.5 ? -1 : 1)
    const l2 = Math.max(15, Math.min(90, l + delta))
    return {
      base: `hsl(${h} ${s}% ${l}%)`,
      target: `hsl(${h} ${s}% ${l2}%)`,
    }
  }

  // easy: show obviously different colors using curated contrasting pairs
  const pairs = [
    { base: 'hsl(210 85% 50%)', target: 'hsl(50 90% 55%)' },   // blue vs yellow
    { base: 'hsl(0 80% 52%)',   target: 'hsl(190 70% 45%)' },  // red vs cyan/teal
    { base: 'hsl(290 70% 55%)', target: 'hsl(120 65% 45%)' },  // purple vs green
    { base: 'hsl(25 85% 55%)',  target: 'hsl(200 75% 45%)' },  // orange vs blue
    { base: 'hsl(140 70% 45%)', target: 'hsl(300 70% 55%)' },  // green vs magenta
    { base: 'hsl(340 75% 60%)', target: 'hsl(200 80% 45%)' },  // pink vs blue
    { base: 'hsl(45 90% 55%)',  target: 'hsl(260 70% 55%)' },  // yellow vs indigo
  ] as const
  const p = pairs[randInt(0, pairs.length - 1)]
  // Randomize which one is the target to avoid habituation
  return Math.random() < 0.5 ? p : { base: p.target, target: p.base }
}

const formatMs = (n: number | null | undefined) =>
  typeof n === 'number' && isFinite(n) ? `${Math.round(n)} ms` : '-'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const ReactionGame: React.FC<Props> = ({ timeLimitSec = 30, initialGrid = 2 }) => {
  // Round increments on every successful hit
  const [round, setRound] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [target, setTarget] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('hard')
  const [colors, setColors] = useState(() => colorPair('hard'))
  const startRef = useRef<number | null>(null)
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitSec * 1000)
  const endAtRef = useRef<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<{ rounds: number; avgMs: number; difficulty: Difficulty } | null>(null)

  // Grid grows from initialGrid by +1 each round (2x2 → 3x3 → ...)
  const grid = useMemo(() => Math.max(2, initialGrid + Math.max(0, round - 1)), [initialGrid, round])
  const totalTiles = grid * grid

  const avg = useMemo(() => {
    if (!times.length) return null
    return times.reduce((a, b) => a + b, 0) / times.length
  }, [times])

  const nextRound = useCallback((overrideDifficulty?: Difficulty) => {
    const idx = randInt(0, totalTiles - 1)
    setTarget(idx)
    const diff = overrideDifficulty ?? difficulty
    setColors(colorPair(diff))
    // Reset per-round timer and start stopwatch after paint
    endAtRef.current = performance.now() + timeLimitSec * 1000
    setRemainingMs(timeLimitSec * 1000)
    // Start timer after paint
    requestAnimationFrame(() => {
      startRef.current = performance.now()
    })
  }, [totalTiles, difficulty, timeLimitSec])

  const startGame = useCallback((d: Difficulty) => {
    setTimes([])
    setRound(1)
    setDifficulty(d)
    setRunning(true)
    // Kick off first round; timer resets inside nextRound
    nextRound(d)
    setShowResult(false)
    setResult(null)
  }, [nextRound])

  const handleHit = useCallback(() => {
    if (!running) return
    const t0 = startRef.current
    if (t0 == null) return
    const t = performance.now() - t0
    setTimes(prev => [...prev, t])
    setRound(r => r + 1)
    nextRound()
  }, [running, times, nextRound])

  // Tile click handler
  const onTileClick = (i: number) => {
    if (!running) return
    if (i === target) {
      handleHit()
    }
  }

  // Timer for time-attack mode (always 30s by request)
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const endAt = endAtRef.current
      if (!endAt) return
      const remain = Math.max(0, endAt - performance.now())
      setRemainingMs(remain)
      if (remain <= 0) {
        setRunning(false)
        // Save bests per difficulty
        try {
          const completed = times.length
          const bestHitsKey = `reaction_pr_best_rounds_${difficulty}`
          const bestAvgKey = `reaction_pr_best_avg_${difficulty}`
          const prevBestHits = Number(localStorage.getItem(bestHitsKey) || '0')
          if (!prevBestHits || completed > prevBestHits) localStorage.setItem(bestHitsKey, String(completed))
          const newAvg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : 0
          const prevBestAvg = Number(localStorage.getItem(bestAvgKey) || '0')
          if (!prevBestAvg || (newAvg && newAvg < prevBestAvg)) localStorage.setItem(bestAvgKey, String(Math.round(newAvg)))
        } catch {}
        // Show result modal
        const completed = times.length
        const newAvg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : 0
        setResult({ rounds: completed, avgMs: newAvg, difficulty })
        setShowResult(true)
      }
    }
    // Run immediately to avoid 1-tick delay
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [running, round, times, difficulty])

  const bestRounds = useMemo(() => {
    try { return Number(localStorage.getItem(`reaction_pr_best_rounds_${difficulty}`) || '0') || null } catch { return null }
  }, [running, difficulty])
  const bestAvgMs = useMemo(() => {
    try { return Number(localStorage.getItem(`reaction_pr_best_avg_${difficulty}`) || '0') || null } catch { return null }
  }, [running, difficulty])

  const tiles = new Array(totalTiles).fill(null)

  return (
    <Wrapper>
      <h1 style={{ color: '#fff', margin: 0 }}>브레인스토밍을 위한 반응속도 테스트</h1>
      <Panel>
        <span>남은 시간: <Stat>{Math.ceil(clamp(remainingMs, 0, timeLimitSec * 1000) / 1000)}s</Stat></span>
        <span>라운드: <Stat>{running ? round : '대기 중'}</Stat></span>
        <span>난이도: <Stat>{difficulty === 'easy' ? '하수' : difficulty === 'medium' ? '중수' : '고수'}</Stat></span>
        <span>이번 평균: <Stat>{formatMs(avg)}</Stat></span>
        {bestRounds ? <span>최고 라운드: <Stat>{bestRounds}</Stat></span> : null}
        {bestAvgMs ? <span>최고 평균: <Stat>{formatMs(bestAvgMs)}</Stat></span> : null}
      </Panel>

      <Board cols={grid}>
        {tiles.map((_, i) => (
          <Tile
            key={i}
            aria-label={i === target ? '타겟' : '타일'}
            onClick={() => onTileClick(i)}
            style={{
              background: i === target ? colors.target : colors.base,
            }}
          />
        ))}
      </Board>

      {!running ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <PrimaryBtn onClick={() => startGame('easy')} aria-label="하수 난이도로 시작">하수</PrimaryBtn>
          <PrimaryBtn onClick={() => startGame('medium')} aria-label="중수 난이도로 시작">중수</PrimaryBtn>
          <PrimaryBtn onClick={() => startGame('hard')} aria-label="고수 난이도로 시작">고수</PrimaryBtn>
        </div>
      ) : (
        <span style={{ color: '#e6e6e6' }}>다른 색 타일을 빠르게 터치하세요!</span>
      )}

      {showResult && result ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-title"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
          }}
          onClick={() => setShowResult(false)}
        >
          <div
            style={{
              background: '#1d1d1f', color: '#e6e6e6', padding: 20, borderRadius: 12,
              width: 'min(420px, 92vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 id="result-title" style={{ margin: '0 0 10px', color: '#fff' }}>결과</h2>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16, fontWeight: 700 }}>
              <div>난이도: <span style={{ color: '#ffd561' }}>{result.difficulty === 'easy' ? '하수' : result.difficulty === 'medium' ? '중수' : '고수'}</span></div>
              <div>완료 라운드: <span style={{ color: '#ffd561' }}>{result.rounds}</span></div>
              <div>평균 반응속도: <span style={{ color: '#ffd561' }}>{formatMs(result.avgMs)}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <SecondaryBtn onClick={() => setShowResult(false)} aria-label="닫기">닫기</SecondaryBtn>
              <PrimaryBtn onClick={() => startGame(result.difficulty)} aria-label="같은 난이도로 다시하기">다시하기</PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default ReactionGame
