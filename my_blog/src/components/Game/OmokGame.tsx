import React, { useCallback, useEffect, useRef, useState } from "react"
import styled from "@emotion/styled"

type Phase = "idle" | "playing" | "gameOver"
type Stone = "black" | "white" | null
type Rule = "free" | "renju"

const BOARD_SIZE = 15
const WIN_COUNT = 5

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
  color: #1f2937;
  font-weight: 700;
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

const BoardContainer = styled.div`
  position: relative;
  width: min(600px, 90vw);
  height: min(600px, 90vw);
  background: #d4a574;
  border: 3px solid #8b5a3c;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  touch-action: none;
  user-select: none;
`

const BoardCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 6px;
`

const StoneOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`

const StoneDisplay = styled.div<{ stone: Stone; size: number }>`
  width: ${({ size }) => size * 0.85}px;
  height: ${({ size }) => size * 0.85}px;
  border-radius: 50%;
  background: ${({ stone }) => (stone === "black" ? "#1a1a1a" : "#f5f5f5")};
  border: ${({ stone }) =>
    stone === "black" ? "2px solid #000" : "2px solid #ccc"};
  box-shadow: ${({ stone }) =>
    stone === "black"
      ? "inset 0 2px 4px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)"
      : "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)"};
  pointer-events: none;
  transition: transform 0.1s ease;
`

const LastMoveIndicator = styled.div<{ x: number; y: number; size: number }>`
  position: absolute;
  left: ${({ x, size }) => x * size + size * 0.5}px;
  top: ${({ y, size }) => y * size + size * 0.5}px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
  pointer-events: none;
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
`

const SecondaryBtn = styled.button`
  border: 1px solid #9ca3af;
  background: transparent;
  color: #374151;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
`

type Move = { x: number; y: number; stone: Stone }

// 승리 판정: 5개 연속 체크
function checkWin(
  board: Stone[][],
  x: number,
  y: number,
  stone: Stone
): boolean {
  if (!stone) return false

  const directions = [
    [1, 0], // 가로
    [0, 1], // 세로
    [1, 1], // 대각선 \
    [1, -1], // 대각선 /
  ]

  for (const [dx, dy] of directions) {
    let count = 1

    // 양방향으로 연속된 돌 개수 세기
    for (const sign of [-1, 1]) {
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x + dx * i * sign
        const ny = y + dy * i * sign
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          board[ny][nx] === stone
        ) {
          count++
        } else {
          break
        }
      }
    }

    if (count >= WIN_COUNT) return true
  }

  return false
}

// 렌주룰: 금수 체크 (3-3, 4-4, 장목)
function isForbiddenMove(
  board: Stone[][],
  x: number,
  y: number,
  stone: Stone,
  rule: Rule
): boolean {
  if (rule === "free" || stone !== "black") return false

  // 3-3 체크: 두 개의 열린 3이 동시에 생기는지
  // 4-4 체크: 두 개의 열린 4가 동시에 생기는지
  // 장목 체크: 6개 이상 연속

  // 간단한 구현: 3-3, 4-4만 체크
  board[y][x] = stone

  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]

  let openThreeCount = 0
  let openFourCount = 0

  for (const [dx, dy] of directions) {
    // 열린 3 체크
    const threePattern = checkOpenThree(board, x, y, dx, dy, stone)
    if (threePattern) openThreeCount++

    // 열린 4 체크
    const fourPattern = checkOpenFour(board, x, y, dx, dy, stone)
    if (fourPattern) openFourCount++
  }

  board[y][x] = null

  if (openThreeCount >= 2 || openFourCount >= 2) return true

  // 장목 체크
  for (const [dx, dy] of directions) {
    let count = 1
    for (const sign of [-1, 1]) {
      for (let i = 1; i < 10; i++) {
        const nx = x + dx * i * sign
        const ny = y + dy * i * sign
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          board[ny][nx] === stone
        ) {
          count++
        } else {
          break
        }
      }
    }
    if (count >= 6) return true
  }

  return false
}

function checkOpenThree(
  board: Stone[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: Stone
): boolean {
  // 간단한 구현: 정확한 3-3 판정은 복잡하므로 생략
  // 실제로는 양쪽 끝이 열려있고 정확히 3개 연속인지 체크 필요
  return false // 일단 false 반환 (구현 생략)
}

function checkOpenFour(
  board: Stone[][],
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: Stone
): boolean {
  // 간단한 구현
  return false
}

// AI: Easy - 랜덤 + 간단 방어
function aiEasy(
  board: Stone[][],
  aiStone: Stone,
  rule: Rule
): [number, number] | null {
  // 1. 승리 수 있으면 승리
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      board[y][x] = aiStone
      if (checkWin(board, x, y, aiStone)) {
        board[y][x] = null
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 2. 상대 승리 막기
  const opponentStone: Stone = aiStone === "black" ? "white" : "black"
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue

      board[y][x] = opponentStone
      if (checkWin(board, x, y, opponentStone)) {
        board[y][x] = null
        if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
          continue
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 3. 기존 돌 주변 2칸 이내 랜덤
  const candidates: [number, number][] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      // 기존 돌 주변 2칸 이내인지 체크
      let nearStone = false
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (
            ny >= 0 &&
            ny < BOARD_SIZE &&
            nx >= 0 &&
            nx < BOARD_SIZE &&
            board[ny][nx] !== null
          ) {
            nearStone = true
            break
          }
        }
        if (nearStone) break
      }

      if (nearStone || candidates.length === 0) {
        candidates.push([x, y])
      }
    }
  }

  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// AI: Normal - 패턴 점수 기반
function aiNormal(
  board: Stone[][],
  aiStone: Stone,
  rule: Rule
): [number, number] | null {
  // 1. 승리 수
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      board[y][x] = aiStone
      if (checkWin(board, x, y, aiStone)) {
        board[y][x] = null
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 2. 상대 승리 막기
  const opponentStone: Stone = aiStone === "black" ? "white" : "black"
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue

      board[y][x] = opponentStone
      if (checkWin(board, x, y, opponentStone)) {
        board[y][x] = null
        if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
          continue
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 3. 패턴 점수 계산
  const candidates: Array<{ x: number; y: number; score: number }> = []

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      // 기존 돌 주변 2칸 이내만 후보
      let nearStone = false
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (
            ny >= 0 &&
            ny < BOARD_SIZE &&
            nx >= 0 &&
            nx < BOARD_SIZE &&
            board[ny][nx] !== null
          ) {
            nearStone = true
            break
          }
        }
        if (nearStone) break
      }

      if (!nearStone && candidates.length > 0) continue

      let score = 0

      // 내 패턴 점수
      board[y][x] = aiStone
      score += evaluatePosition(board, x, y, aiStone) * 2
      board[y][x] = null

      // 상대 방어 점수
      board[y][x] = opponentStone
      score += evaluatePosition(board, x, y, opponentStone)
      board[y][x] = null

      // 중앙 가까울수록 보너스
      const centerDist =
        Math.abs(x - BOARD_SIZE / 2) + Math.abs(y - BOARD_SIZE / 2)
      score += (BOARD_SIZE - centerDist) * 0.1

      candidates.push({ x, y, score })
    }
  }

  if (candidates.length === 0) return null

  // 최고 점수 선택
  candidates.sort((a, b) => b.score - a.score)
  const maxScore = candidates[0].score
  const topCandidates = candidates.filter(c => c.score === maxScore)
  const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)]
  return [chosen.x, chosen.y]
}

// 패턴 평가 (간단 버전)
function evaluatePosition(
  board: Stone[][],
  x: number,
  y: number,
  stone: Stone
): number {
  let score = 0
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]

  for (const [dx, dy] of directions) {
    let count = 1
    let blocked = 0

    for (const sign of [-1, 1]) {
      let found = false
      for (let i = 1; i < WIN_COUNT; i++) {
        const nx = x + dx * i * sign
        const ny = y + dy * i * sign
        if (
          nx >= 0 &&
          nx < BOARD_SIZE &&
          ny >= 0 &&
          ny < BOARD_SIZE &&
          board[ny][nx] === stone
        ) {
          count++
          found = true
        } else {
          if (
            nx < 0 ||
            nx >= BOARD_SIZE ||
            ny < 0 ||
            ny >= BOARD_SIZE ||
            board[ny]?.[nx] !== null
          ) {
            blocked++
          }
          break
        }
      }
    }

    // 패턴 점수
    if (count >= 4) score += 1000
    else if (count === 3 && blocked === 0) score += 100
    else if (count === 3 && blocked === 1) score += 50
    else if (count === 2 && blocked === 0) score += 10
    else if (count === 2 && blocked === 1) score += 5
  }

  return score
}

// AI: Hard - 미니맥스 + 알파베타 (깊이 제한)
function aiHard(
  board: Stone[][],
  aiStone: Stone,
  rule: Rule
): [number, number] | null {
  // 1. 승리 수
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      board[y][x] = aiStone
      if (checkWin(board, x, y, aiStone)) {
        board[y][x] = null
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 2. 상대 승리 막기
  const opponentStone: Stone = aiStone === "black" ? "white" : "black"
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue

      board[y][x] = opponentStone
      if (checkWin(board, x, y, opponentStone)) {
        board[y][x] = null
        if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
          continue
        return [x, y]
      }
      board[y][x] = null
    }
  }

  // 3. Normal 점수로 후보 상위 10개만 선택
  const candidates: Array<{ x: number; y: number; score: number }> = []

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (rule === "renju" && isForbiddenMove(board, x, y, aiStone, rule))
        continue

      let nearStone = false
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (
            ny >= 0 &&
            ny < BOARD_SIZE &&
            nx >= 0 &&
            nx < BOARD_SIZE &&
            board[ny][nx] !== null
          ) {
            nearStone = true
            break
          }
        }
        if (nearStone) break
      }

      if (!nearStone && candidates.length > 0) continue

      let score = 0
      board[y][x] = aiStone
      score += evaluatePosition(board, x, y, aiStone) * 2
      board[y][x] = null

      board[y][x] = opponentStone
      score += evaluatePosition(board, x, y, opponentStone)
      board[y][x] = null

      const centerDist =
        Math.abs(x - BOARD_SIZE / 2) + Math.abs(y - BOARD_SIZE / 2)
      score += (BOARD_SIZE - centerDist) * 0.1

      candidates.push({ x, y, score })
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.score - a.score)
  const topN = candidates.slice(0, 10)

  // 미니맥스 (깊이 2)
  let bestMove: [number, number] | null = null
  let bestScore = -Infinity

  for (const candidate of topN) {
    board[candidate.y][candidate.x] = aiStone
    const score = minimax(
      board,
      candidate.x,
      candidate.y,
      opponentStone,
      aiStone,
      rule,
      2,
      false,
      -Infinity,
      Infinity
    )
    board[candidate.y][candidate.x] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = [candidate.x, candidate.y]
    }
  }

  return bestMove || [topN[0].x, topN[0].y]
}

function minimax(
  board: Stone[][],
  lastX: number,
  lastY: number,
  currentStone: Stone,
  aiStone: Stone,
  rule: Rule,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  // 승리 체크
  if (
    checkWin(
      board,
      lastX,
      lastY,
      currentStone === aiStone ? aiStone : currentStone
    )
  ) {
    return isMaximizing ? -10000 : 10000
  }

  if (depth === 0) {
    // 평가 함수
    return (
      evaluatePosition(board, lastX, lastY, aiStone) -
      evaluatePosition(
        board,
        lastX,
        lastY,
        aiStone === "black" ? "white" : "black"
      )
    )
  }

  const nextStone: Stone = currentStone === "black" ? "white" : "black"
  const candidates: Array<{ x: number; y: number; score: number }> = []

  // 후보 생성 (기존 돌 주변)
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== null) continue
      if (
        rule === "renju" &&
        currentStone === "black" &&
        isForbiddenMove(board, x, y, currentStone, rule)
      )
        continue

      let nearStone = false
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ny = y + dy
          const nx = x + dx
          if (
            ny >= 0 &&
            ny < BOARD_SIZE &&
            nx >= 0 &&
            nx < BOARD_SIZE &&
            board[ny][nx] !== null
          ) {
            nearStone = true
            break
          }
        }
        if (nearStone) break
      }

      if (!nearStone) continue

      let score = evaluatePosition(board, x, y, nextStone)
      candidates.push({ x, y, score })
    }
  }

  if (candidates.length === 0) return 0

  candidates.sort((a, b) => b.score - a.score)
  const topCandidates = candidates.slice(0, 5) // 상위 5개만 탐색

  if (isMaximizing) {
    let maxScore = -Infinity
    for (const candidate of topCandidates) {
      board[candidate.y][candidate.x] = nextStone
      const score = minimax(
        board,
        candidate.x,
        candidate.y,
        nextStone,
        aiStone,
        rule,
        depth - 1,
        false,
        alpha,
        beta
      )
      board[candidate.y][candidate.x] = null
      maxScore = Math.max(maxScore, score)
      alpha = Math.max(alpha, score)
      if (beta <= alpha) break
    }
    return maxScore
  } else {
    let minScore = Infinity
    for (const candidate of topCandidates) {
      board[candidate.y][candidate.x] = nextStone
      const score = minimax(
        board,
        candidate.x,
        candidate.y,
        nextStone,
        aiStone,
        rule,
        depth - 1,
        true,
        alpha,
        beta
      )
      board[candidate.y][candidate.x] = null
      minScore = Math.min(minScore, score)
      beta = Math.min(beta, score)
      if (beta <= alpha) break
    }
    return minScore
  }
}

const OmokGame: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("idle")
  const [rule, setRule] = useState<Rule>("free")
  const difficulty: "normal" = "normal" // 고정 난이도
  const [currentTurn, setCurrentTurn] = useState<Stone>("black")
  const [board, setBoard] = useState<Stone[][]>(() =>
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null))
  )
  const boardRef = useRef<Stone[][]>(board)
  const [moves, setMoves] = useState<Move[]>([])
  const [history, setHistory] = useState<Stone[][][]>([])
  const [winner, setWinner] = useState<Stone | null>(null)
  const [lastMove, setLastMove] = useState<[number, number] | null>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [streak, setStreak] = useState<number>(0) // 연승 횟수

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [cellSize, setCellSize] = useState<number>(0)

  // board 변경 시 ref 업데이트
  useEffect(() => {
    boardRef.current = board
  }, [board])

  // 보드 그리기
  useEffect(() => {
    if (typeof window === "undefined") return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const size = Math.min(rect.width, rect.height)
      canvas.width = size
      canvas.height = size
      const newCellSize = size / (BOARD_SIZE + 1)
      setCellSize(newCellSize)

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, size, size)

      // 배경
      ctx.fillStyle = "#d4a574"
      ctx.fillRect(0, 0, size, size)

      // 격자선
      ctx.strokeStyle = "#8b5a3c"
      ctx.lineWidth = 1

      const margin = newCellSize
      const gridSize = size - margin * 2

      for (let i = 0; i < BOARD_SIZE; i++) {
        const pos = margin + (gridSize / (BOARD_SIZE - 1)) * i

        // 세로선
        ctx.beginPath()
        ctx.moveTo(pos, margin)
        ctx.lineTo(pos, size - margin)
        ctx.stroke()

        // 가로선
        ctx.beginPath()
        ctx.moveTo(margin, pos)
        ctx.lineTo(size - margin, pos)
        ctx.stroke()
      }

      // 별 표시 (천원, 삼삼, 사사)
      const starPoints = [
        [3, 3],
        [3, 11],
        [11, 3],
        [11, 11],
        [7, 7],
      ]

      ctx.fillStyle = "#8b5a3c"
      for (const [x, y] of starPoints) {
        const px = margin + (gridSize / (BOARD_SIZE - 1)) * x
        const py = margin + (gridSize / (BOARD_SIZE - 1)) * y
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [phase])

  const resetGame = useCallback(() => {
    setBoard(
      Array(BOARD_SIZE)
        .fill(null)
        .map(() => Array(BOARD_SIZE).fill(null))
    )
    setMoves([])
    setHistory([])
    setWinner(null)
    setLastMove(null)
    setCurrentTurn("black")
    setPhase("playing")
  }, [])

  const makeMove = useCallback(
    (x: number, y: number, stone: Stone, boardState?: Stone[][]) => {
      const currentBoard = boardState || board
      if (currentBoard[y][x] !== null) return false
      if (
        rule === "renju" &&
        stone === "black" &&
        isForbiddenMove(currentBoard, x, y, stone, rule)
      ) {
        alert("금수입니다!")
        return false
      }

      const newBoard = currentBoard.map(row => [...row])
      newBoard[y][x] = stone

      setBoard(newBoard)
      setMoves(prev => [...prev, { x, y, stone }])
      setHistory(prev => [...prev, currentBoard.map(row => [...row])])
      setLastMove([x, y])

      if (checkWin(newBoard, x, y, stone)) {
        setWinner(stone)
        setPhase("gameOver")
        // 흑이 이기면 연승 +1, 백이 이기면 연승 리셋
        if (stone === "black") {
          setStreak(prev => prev + 1)
        } else {
          setStreak(0)
        }
        return true
      }

      setCurrentTurn(stone === "black" ? "white" : "black")
      return true
    },
    [board, rule]
  )

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prevBoard = history[history.length - 1]
    setBoard(prevBoard.map(row => [...row]))
    setHistory(prev => prev.slice(0, -1))
    setMoves(prev => prev.slice(0, -1))
    setCurrentTurn(prev => (prev === "black" ? "white" : "black"))
    setLastMove(
      moves.length > 1
        ? [moves[moves.length - 2].x, moves[moves.length - 2].y]
        : null
    )
    setWinner(null)
    if (phase === "gameOver") setPhase("playing")
  }, [history, moves, phase])

  // Canvas 클릭 이벤트로 좌표 계산
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (phase !== "playing") return
      if (winner) return
      if (currentTurn === "white") return // AI 턴
      if (isAiThinking) return

      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      const size = Math.min(rect.width, rect.height)
      const margin = size / (BOARD_SIZE + 1)
      const gridSize = size - margin * 2

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // 가장 가까운 교차점 찾기
      let minDist = Infinity
      let bestX = -1
      let bestY = -1

      for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
          const px = margin + (gridSize / (BOARD_SIZE - 1)) * i
          const py = margin + (gridSize / (BOARD_SIZE - 1)) * j
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2)
          if (dist < minDist && dist < cellSize * 0.4) {
            minDist = dist
            bestX = i
            bestY = j
          }
        }
      }

      if (bestX >= 0 && bestY >= 0) {
        makeMove(bestX, bestY, currentTurn)
      }
    },
    [phase, winner, currentTurn, isAiThinking, makeMove, cellSize]
  )

  // AI 턴 처리
  useEffect(() => {
    if (phase !== "playing" || winner) return
    if (currentTurn !== "white") return // AI는 백
    if (isAiThinking) return

    setIsAiThinking(true)
    const timer = setTimeout(() => {
      // 최신 board 상태 가져오기
      const currentBoard = boardRef.current
      const aiStone: Stone = "white"
      let aiMove: [number, number] | null = null

      // 난이도는 normal로 고정
      aiMove = aiNormal(currentBoard, aiStone, rule)

      if (aiMove) {
        const newBoard = currentBoard.map(row => [...row])
        newBoard[aiMove![1]][aiMove![0]] = aiStone

        // 모든 상태 업데이트
        setBoard(newBoard)
        setMoves(prev => [
          ...prev,
          { x: aiMove![0], y: aiMove![1], stone: aiStone },
        ])
        setHistory(prev => [...prev, currentBoard.map(row => [...row])])
        setLastMove([aiMove![0], aiMove![1]])

        if (checkWin(newBoard, aiMove![0], aiMove![1], aiStone)) {
          setWinner(aiStone)
          setPhase("gameOver")
          // 백(AI)이 이기면 연승 리셋
          setStreak(0)
        } else {
          setCurrentTurn("black")
        }

        setIsAiThinking(false)
      } else {
        setIsAiThinking(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [phase, winner, currentTurn, rule])

  const startGame = useCallback(() => {
    resetGame()
  }, [resetGame])

  const margin = cellSize
  const gridSize = cellSize > 0 ? cellSize * (BOARD_SIZE - 1) : 0

  return (
    <Wrapper>
      {phase === "playing" && (
        <Panel>
          <span>
            현재 턴:{" "}
            <Stat
              style={{
                background: currentTurn === "black" ? "#1a1a1a" : "#f5f5f5",
                color: currentTurn === "black" ? "#fff" : "#000",
              }}
            >
              {currentTurn === "black" ? "흑" : "백"}
            </Stat>
          </span>
          {isAiThinking && <span>AI 생각 중...</span>}
          <SecondaryBtn onClick={resetGame}>다시 시작</SecondaryBtn>
        </Panel>
      )}

      {phase === "idle" && (
        <div style={{ textAlign: "center" }}>
          <PrimaryBtn onClick={startGame}>게임 시작</PrimaryBtn>
        </div>
      )}

      {phase === "gameOver" && winner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="omok-win-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={resetGame}
        >
          <div
            style={{
              background: "#1d1d1f",
              color: "#e6e6e6",
              padding: 24,
              borderRadius: 12,
              width: "min(420px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "grid",
              gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              id="omok-win-title"
              style={{ margin: 0, color: "#fff", fontSize: 24 }}
            >
              {winner === "black" ? "🎉 흑 승리!" : "🤖 백 승리!"}
            </h2>
            <div
              style={{
                display: "grid",
                gap: 8,
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              <div>
                총 수순:{" "}
                <span style={{ color: "#ffd561" }}>{moves.length}</span>
              </div>
              {winner === "black" && (
                <div>
                  연승: <span style={{ color: "#ffd561" }}>{streak}연승</span>
                </div>
              )}
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <PrimaryBtn onClick={resetGame} aria-label="다시하기">
                다시하기
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      <BoardContainer ref={containerRef}>
        <BoardCanvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            cursor:
              phase === "playing" && !isAiThinking ? "pointer" : "default",
          }}
        />
        {cellSize > 0 && (
          <StoneOverlay>
            {board.map((row, y) =>
              row.map((stone, x) => {
                const px = margin + (gridSize / (BOARD_SIZE - 1)) * x
                const py = margin + (gridSize / (BOARD_SIZE - 1)) * y
                return (
                  <React.Fragment key={`${x}-${y}`}>
                    {stone && (
                      <StoneDisplay
                        stone={stone}
                        size={cellSize}
                        style={{
                          position: "absolute",
                          left: `${px - cellSize * 0.425}px`,
                          top: `${py - cellSize * 0.425}px`,
                        }}
                      />
                    )}
                  </React.Fragment>
                )
              })
            )}
            {lastMove && (
              <LastMoveIndicator
                x={lastMove[0]}
                y={lastMove[1]}
                size={cellSize}
                style={{
                  left: `${
                    margin + (gridSize / (BOARD_SIZE - 1)) * lastMove[0]
                  }px`,
                  top: `${
                    margin + (gridSize / (BOARD_SIZE - 1)) * lastMove[1]
                  }px`,
                }}
              />
            )}
          </StoneOverlay>
        )}
      </BoardContainer>
    </Wrapper>
  )
}

export default OmokGame
