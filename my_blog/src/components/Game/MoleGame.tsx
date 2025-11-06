import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "@emotion/styled"

type Difficulty = "easy"

type Props = {
  initialGrid?: number
  maxGrid?: number
  requiredPerRound?: number
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
  color: #333;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  backdrop-filter: saturate(120%) blur(2px);
`

const Stat = styled.span`
  color: #1f2937;
  background: #fff3bf;
  padding: 2px 8px;
  border-radius: 8px;
`

const Board = styled.div<{ cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ cols }) => cols}, minmax(0, 1fr));
  gap: 10px;
  width: min(560px, 92vw);
  margin-top: 8px;
`

const Tile = styled.button<{ isMole?: boolean }>`
  aspect-ratio: 1 / 1;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2) inset,
    0 3px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.06s ease, background 0.12s ease;
  &:active {
    transform: scale(0.98);
  }
  /* Base color (red when mole visible, blue otherwise) */
  background-color: ${({ isMole }) => (isMole ? "#ef4444" : "#60a5fa")};
  /* Center the mole image on active tiles */
  background-image: ${({ isMole }) => (isMole ? "url('/mole.png')" : "none")};
  background-repeat: no-repeat;
  background-position: center;
  background-size: 68%;
  color: transparent;
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

type Mole = {
  id: string
  idx: number
  fake: boolean
  despawnAt: number
}

function nowMs() {
  return performance.now()
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const MISS_LIMIT = 5

function settingsFor(_d: Difficulty, round: number) {
  // Single difficulty (easy). Scale by round only.
  const r = Math.max(1, round)
  const ttlBase = 1100
  const intervalBase = 850
  const ttl = clamp(ttlBase - (r - 1) * 70, 330, ttlBase)
  const interval = clamp(intervalBase - (r - 1) * 50, 280, intervalBase)
  const sim = 1
  const fakeChance = 0
  return { ttl, interval, sim, fakeChance }
}

const MoleGame: React.FC<Props> = ({
  initialGrid = 3,
  maxGrid = 6,
  requiredPerRound = 5,
}) => {
  const [running, setRunning] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")

  const [round, setRound] = useState(1)
  const grid = useMemo(
    () => clamp(initialGrid + (round - 1), 3, maxGrid),
    [initialGrid, round, maxGrid]
  )
  const totalTiles = grid * grid

  const [active, setActive] = useState<Mole[]>([])
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0) // per-round misses
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [caughtInRound, setCaughtInRound] = useState(0)
  const [roundClear, setRoundClear] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const nextSpawnAtRef = useRef<number>(0)
  const tickIdRef = useRef<number | null>(null)

  const { ttl, interval, sim, fakeChance } = useMemo(
    () => settingsFor(difficulty, round),
    [difficulty, round]
  )

  // Required count scales +2 per round (base is requiredPerRound)
  const requiredThisRound = useMemo(
    () => requiredPerRound + (round - 1) * 2,
    [requiredPerRound, round]
  )

  const resetAll = useCallback(() => {
    setActive([])
    setHits(0)
    setMisses(0)
    setCombo(0)
    setBestCombo(0)
    setCaughtInRound(0)
    setRound(1)
    setRoundClear(false)
  }, [])

  const startGame = useCallback(
    (d: Difficulty) => {
      setDifficulty(d)
      resetAll()
      setRunning(true)
      nextSpawnAtRef.current = nowMs() + interval
    },
    [resetAll, interval]
  )

  // Stop spawns when round is cleared
  useEffect(() => {
    if (caughtInRound >= requiredThisRound && running) {
      setRunning(false)
      setRoundClear(true)
    }
  }, [caughtInRound, requiredThisRound, running])

  // End game when per-round misses reach MISS_LIMIT
  useEffect(() => {
    if (running && misses >= MISS_LIMIT) {
      setRunning(false)
      setGameOver(true)
    }
  }, [running, misses])

  const proceedNextRound = useCallback(() => {
    setRound(r => r + 1)
    setCaughtInRound(0)
    setActive([])
    setRoundClear(false)
    setMisses(0)
    setCombo(0)
    setRunning(true)
    nextSpawnAtRef.current = nowMs() + interval
  }, [interval])

  // Tick loop: spawn moles and despawn expired ones
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const now = nowMs()

      // Despawn expired moles
      setActive(prev => {
        if (prev.length === 0) return prev
        const keep: Mole[] = []
        let missed = 0
        for (const m of prev) {
          if (m.despawnAt <= now) {
            if (!m.fake) missed++
          } else {
            keep.push(m)
          }
        }
        if (missed > 0) setMisses(x => x + missed)
        return keep
      })

      // Spawn if time and capacity
      if (now >= nextSpawnAtRef.current) {
        setActive(prev => {
          if (prev.length >= sim) return prev
          const occupied = new Set(prev.map(p => p.idx))
          let idx = Math.floor(Math.random() * totalTiles)
          let guard = 0
          while (occupied.has(idx) && guard++ < 20) {
            idx = Math.floor(Math.random() * totalTiles)
          }
          const fake = Math.random() < fakeChance
          const m: Mole = {
            id: Math.random().toString(36).slice(2),
            idx,
            fake,
            despawnAt: now + ttl,
          }
          return [...prev, m]
        })
        // schedule next spawn
        const jitter = 0.6 + Math.random() * 0.8 // 0.6~1.4x jitter
        nextSpawnAtRef.current = now + interval * jitter
      }

      tickIdRef.current = window.setTimeout(tick, 100) as any
    }
    tickIdRef.current = window.setTimeout(tick, 100) as any
    return () => {
      if (tickIdRef.current) {
        clearTimeout(tickIdRef.current)
        tickIdRef.current = null
      }
    }
  }, [running, totalTiles, sim, fakeChance, ttl, interval])

  const onTileClick = useCallback(
    (i: number) => {
      if (!running) return
      setActive(prev => {
        const idx = prev.findIndex(m => m.idx === i)
        if (idx === -1) {
          // 빈 칸을 잘못 클릭해도 미스로 처리
          setCombo(0)
          setMisses(x => x + 1)
          return prev
        }
        const m = prev[idx]
        const rest = prev.slice(0, idx).concat(prev.slice(idx + 1))
        if (m.fake) {
          setCombo(0)
          setMisses(x => x + 1)
        } else {
          setHits(x => x + 1)
          setCaughtInRound(x => x + 1)
          setCombo(c => {
            const next = c + 1
            setBestCombo(b => (next > b ? next : b))
            return next
          })
        }
        return rest
      })
    },
    [running]
  )

  const tiles = useMemo(() => new Array(totalTiles).fill(null), [totalTiles])
  const activeIdx = useMemo(() => new Set(active.map(a => a.idx)), [active])

  const restart = useCallback(() => {
    setGameOver(false)
    resetAll()
    setRunning(true)
    nextSpawnAtRef.current = nowMs() + interval
  }, [interval, resetAll])

  return (
    <Wrapper>
      <h1 style={{ color: "#1b1b1b", margin: 0 }}>두더지 잡기</h1>
      <Panel>
        <span>
          라운드: <Stat>{round}</Stat>
        </span>
        <span>
          잡은 수:{" "}
          <Stat>
            {caughtInRound}/{requiredThisRound}
          </Stat>
        </span>
        <span>
          콤보: <Stat>{combo}</Stat>
        </span>
        <span>
          미스:{" "}
          <Stat>
            {misses}/{MISS_LIMIT}
          </Stat>
        </span>
      </Panel>

      <Board cols={grid}>
        {tiles.map((_, i) => (
          <Tile
            key={i}
            type="button"
            aria-label={activeIdx.has(i) ? "두더지" : "타일"}
            isMole={activeIdx.has(i)}
            onClick={() => onTileClick(i)}
          />
        ))}
      </Board>

      {!running && !roundClear ? (
        <PrimaryBtn onClick={() => startGame("easy")} aria-label="게임 시작">
          게임 시작
        </PrimaryBtn>
      ) : null}

      {roundClear ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mole-roundclear-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={proceedNextRound}
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
            onClick={e => e.stopPropagation()}
          >
            <h2
              id="mole-roundclear-title"
              style={{ margin: "0 0 10px", color: "#fff" }}
            >
              라운드 클리어!
            </h2>
            <div
              style={{
                display: "grid",
                gap: 8,
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              <div>
                다음 라운드 배열:{" "}
                <span style={{ color: "#ffd561" }}>
                  {clamp(grid + 1, 3, maxGrid)}x{clamp(grid + 1, 3, maxGrid)}
                </span>
              </div>
              <div>
                현재 최고 콤보:{" "}
                <span style={{ color: "#ffd561" }}>{bestCombo}</span>
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <PrimaryBtn onClick={proceedNextRound} aria-label="다음 라운드">
                다음 라운드
              </PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}

      {gameOver ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mole-over-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={restart}
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
            onClick={e => e.stopPropagation()}
          >
            <h2
              id="mole-over-title"
              style={{ margin: "0 0 10px", color: "#fff" }}
            >
              미스 {MISS_LIMIT}회로 종료!
            </h2>
            <div
              style={{
                display: "grid",
                gap: 8,
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              <div>
                도달 라운드: <span style={{ color: "#ffd561" }}>{round}</span>
              </div>

              <div>
                미스:{" "}
                <span style={{ color: "#ffd561" }}>
                  {misses}/{MISS_LIMIT}
                </span>
              </div>
              <div>
                최고 콤보: <span style={{ color: "#ffd561" }}>{bestCombo}</span>
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <PrimaryBtn onClick={restart} aria-label="다시하기">
                다시하기
              </PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default MoleGame
