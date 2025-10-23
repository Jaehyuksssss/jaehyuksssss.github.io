import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from '@emotion/styled'

type Props = {
  // Time-attack limit in seconds (always 30 by request)
  timeLimitSec?: number
  // Starting grid size (NxN). Increases by +1 each round: 2,3,4...
  initialGrid?: number
}

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

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function colorPair() {
  const h = randInt(0, 359)
  const s = randInt(68, 90)
  const l = randInt(42, 58)
  const delta = randInt(9, 15) * (Math.random() < 0.5 ? -1 : 1)
  const l2 = Math.max(20, Math.min(85, l + delta))
  return {
    base: `hsl(${h} ${s}% ${l}%)`,
    target: `hsl(${h} ${s}% ${l2}%)`,
  }
}

const formatMs = (n: number | null | undefined) =>
  typeof n === 'number' && isFinite(n) ? `${Math.round(n)} ms` : '-'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const ReactionGame: React.FC<Props> = ({ timeLimitSec = 30, initialGrid = 2 }) => {
  // Round increments on every successful hit
  const [round, setRound] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [target, setTarget] = useState(0)
  const [colors, setColors] = useState(() => colorPair())
  const startRef = useRef<number | null>(null)
  const [running, setRunning] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitSec * 1000)
  const endAtRef = useRef<number | null>(null)

  // Grid grows from initialGrid by +1 each round (2x2 → 3x3 → ...)
  const grid = useMemo(() => Math.max(2, initialGrid + Math.max(0, round - 1)), [initialGrid, round])
  const totalTiles = grid * grid

  const avg = useMemo(() => {
    if (!times.length) return null
    return times.reduce((a, b) => a + b, 0) / times.length
  }, [times])

  const nextRound = useCallback(() => {
    const idx = randInt(0, totalTiles - 1)
    setTarget(idx)
    setColors(colorPair())
    // Start timer after paint
    requestAnimationFrame(() => {
      startRef.current = performance.now()
    })
  }, [totalTiles])

  const startGame = useCallback(() => {
    setTimes([])
    setRound(1)
    setRunning(true)
    setRemainingMs(timeLimitSec * 1000)
    // Set end time and kick off first round
    endAtRef.current = performance.now() + timeLimitSec * 1000
    nextRound()
  }, [nextRound, timeLimitSec])

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
        // Save bests for 30s time-attack
        try {
          const bestHitsKey = 'reaction_30s_best_hits'
          const bestAvgKey = 'reaction_30s_best_avg'
          const prevBestHits = Number(localStorage.getItem(bestHitsKey) || '0')
          if (!prevBestHits || round > prevBestHits) localStorage.setItem(bestHitsKey, String(round))
          const newAvg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length) : 0
          const prevBestAvg = Number(localStorage.getItem(bestAvgKey) || '0')
          if (!prevBestAvg || (newAvg && newAvg < prevBestAvg)) localStorage.setItem(bestAvgKey, String(Math.round(newAvg)))
        } catch {}
      }
    }
    // Run immediately to avoid 1-tick delay
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [running, round, times])

  const bestHits30s = useMemo(() => {
    try { return Number(localStorage.getItem('reaction_30s_best_hits') || '0') || null } catch { return null }
  }, [running])
  const bestAvgMs30s = useMemo(() => {
    try { return Number(localStorage.getItem('reaction_30s_best_avg') || '0') || null } catch { return null }
  }, [running])

  const tiles = new Array(totalTiles).fill(null)

  return (
    <Wrapper>
      <h1 style={{ color: '#1b1b1b', margin: 0 }}>브레인스토밍 합시다!</h1>
      <Panel>
        <span>남은 시간: <Stat>{Math.ceil(clamp(remainingMs, 0, timeLimitSec * 1000) / 1000)}s</Stat></span>
        <span>라운드: <Stat>{running ? round : '대기 중'}</Stat></span>
        <span>이번 평균: <Stat>{formatMs(avg)}</Stat></span>
        {bestHits30s ? <span>최고 라운드(30s): <Stat>{bestHits30s}</Stat></span> : null}
        {bestAvgMs30s ? <span>최고 평균(30s): <Stat>{formatMs(bestAvgMs30s)}</Stat></span> : null}
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
        <PrimaryBtn onClick={startGame} aria-label="게임 시작">게임 시작 (30초)</PrimaryBtn>
      ) : (
        <span style={{ color: '#e6e6e6' }}>다른 색 타일을 빠르게 터치하세요!</span>
      )}
    </Wrapper>
  )
}

export default ReactionGame
