import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "@emotion/styled"
import { submitOppositeClickScore } from "lib/oppositeClickApi"

type Phase = "idle" | "ready" | "playing" | "result" | "finished"
type Twist = "reverse" | "truth"

type WordPair = {
  word: string
  opposite: string
  category: string
}

type Round = {
  prompt: string
  displayWord: string
  options: string[]
  correct: string
  twist: Twist
  timeLimitMs: number
  wordCount: number
}

type RoundResult = {
  success: boolean
  picked: string | null
  correct: string
  elapsedMs: number
  twist: Twist
  reason: "select" | "timeout"
}

type Props = {
  onSubmitSuccess?: () => void
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 16px 48px;
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

const Card = styled.div<{ accent?: "truth" }>`
  width: min(640px, 96vw);
  background: ${({ accent }) => (accent === "truth" ? "#ecfeff" : "#ffffff")};
  color: #1b1b1b;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  display: grid;
  gap: 8px;
`

const PromptLabel = styled.div`
  font-size: 15px;
  color: #475569;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
`

const DisplayWord = styled.div`
  font-size: clamp(36px, 8vw, 52px);
  font-weight: 900;
  letter-spacing: 1px;
  text-align: center;
  color: #1b1b1b;
`

const TimerRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
`

const TimerBar = styled.div`
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
  height: 10px;
  position: relative;
`

const TimerFill = styled.div<{ ratio: number; danger?: boolean }>`
  position: absolute;
  inset: 0;
  width: ${({ ratio }) => Math.max(0, Math.min(1, ratio)) * 100}%;
  background: ${({ danger }) => (danger ? "#ef4444" : "#60a5fa")};
  transition: width 80ms linear;
`

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  width: min(640px, 96vw);
`

const OptionBtn = styled.button<{ state?: "idle" | "correct" | "wrong" }>`
  padding: 14px 12px;
  border-radius: 10px;
  border: none;
  background: ${({ state }) =>
    state === "correct"
      ? "#22c55e"
      : state === "wrong"
      ? "#fca5a5"
      : "#e5e7eb"};
  color: ${({ state }) => (state ? "#111" : "#1f2937")};
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.06s ease;
  &:active {
    transform: scale(0.98);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }
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
  border: 1px solid #9ca3af;
  background: transparent;
  color: #374151;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
`

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  font-size: 16px;
  outline: none;
`

const wordPairs: WordPair[] = [
  { word: "위", opposite: "아래", category: "방향" },
  { word: "좌", opposite: "우", category: "방향" },
  { word: "앞", opposite: "뒤", category: "방향" },
  { word: "안", opposite: "밖", category: "위치" },
  { word: "시작", opposite: "끝", category: "시간" },
  { word: "빨강", opposite: "파랑", category: "색상" },
  { word: "흰색", opposite: "검정", category: "색상" },
  { word: "밝음", opposite: "어둠", category: "상태" },
  { word: "뜨거움", opposite: "차가움", category: "온도" },
  { word: "크다", opposite: "작다", category: "크기" },
  { word: "길다", opposite: "짧다", category: "길이" },
  { word: "높다", opposite: "낮다", category: "높이" },
  { word: "많다", opposite: "적다", category: "양" },
  { word: "빠르다", opposite: "느리다", category: "속도" },
  { word: "좋다", opposite: "나쁘다", category: "감정" },
  { word: "행복", opposite: "슬픔", category: "감정" },
  { word: "웃음", opposite: "울음", category: "감정" },
  { word: "건강", opposite: "병", category: "상태" },
  { word: "성공", opposite: "실패", category: "결과" },
  { word: "열다", opposite: "닫다", category: "행동" },
  { word: "켜다", opposite: "끄다", category: "행동" },
  { word: "올라가다", opposite: "내려가다", category: "행동" },
  { word: "나타나다", opposite: "사라지다", category: "행동" },
  { word: "안쪽", opposite: "바깥", category: "방향" },
  { word: "오전", opposite: "오후", category: "시간" },
  { word: "과거", opposite: "미래", category: "시간" },
  { word: "도착", opposite: "출발", category: "여정" },
  { word: "좌회전", opposite: "우회전", category: "방향" },
  { word: "확대", opposite: "축소", category: "상태" },
  { word: "가볍다", opposite: "무겁다", category: "상태" },
]

const successMsgs = [
  "굿! 맞아요! 반대로 했네요!",
  "굿! 대단해요! 역시 혼란스러웠죠?",
  "굿! 성공! 천재인가요?",
  "굿! 반전 성공! 손가락이 빠르네요.",
  "굿! ",
]

const failMsgs = [
  "땡 아쉽네요! 반대로 해야 했어요!",
  "땡! ㅋㅋ",
  "땡 인간의 본능을 따르면 안 돼요!",
  "땡 방심하면 바로 당합니다!",
]

const truthFailMsgs = [
  "땡 아이고! 이번엔 진짜로 해야 했는데!",
  "땡! 이번엔 진짜였어요!",
]

const truthSuccessMsgs = [
  "굿! 정말로 맞췄네요! 이번엔 진짜였어요!",
  "굿! 역시! 이번엔 제대로 했네요!",
]

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickPair(exclude?: WordPair): WordPair {
  const pool = exclude
    ? wordPairs.filter(p => p.word !== exclude.word)
    : wordPairs
  return pool[Math.floor(Math.random() * pool.length)]
}

function formatSeconds(ms: number) {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  return `${sec}초`
}

function calcRoundScore(params: {
  elapsedMs: number
  streak: number
  timeLimit: number
}) {
  const base = 10
  const speedBonus = Math.max(
    0,
    Math.floor(((params.timeLimit - params.elapsedMs) / 1000) * 5)
  )
  const streakBonus = Math.max(0, params.streak * 2)
  return base + speedBonus + streakBonus
}

const TIME_LIMIT_MS = 2000
const WORD_COUNT = 2
const SESSION_DURATION_MS = 90000 // 90초

function chooseTwist(params: { roundNumber: number; streak: number }) {
  const { roundNumber, streak } = params
  // 기본 20% 확률로 진짜로 맞추기, 연속 성공시 약간 증가
  const baseTruth = 0.2 + Math.min(0.05, streak * 0.005)
  const forceTruth = roundNumber > 0 && roundNumber % 5 === 0
  const roll = Math.random()
  return roll < baseTruth || forceTruth ? "truth" : "reverse"
}

function buildRound(params: { roundNumber: number; streak: number }): Round {
  const primaryPair = pickPair()
  const chosenWord =
    Math.random() < 0.5 ? primaryPair.word : primaryPair.opposite
  const counterpart =
    chosenWord === primaryPair.word ? primaryPair.opposite : primaryPair.word
  const twist = chooseTwist({
    roundNumber: params.roundNumber,
    streak: params.streak,
  })

  const prompt =
    twist === "truth"
      ? "⚡ 이번엔 진짜로 맞추세요"
      : "다음 단어를 클릭하세요 (반대로!)"

  // 항상 2개 단어만 제공: 맞는말과 반댓말
  const options = shuffle([chosenWord, counterpart])
  const correct = twist === "truth" ? chosenWord : counterpart

  return {
    prompt,
    displayWord: chosenWord,
    options,
    correct,
    twist,
    timeLimitMs: TIME_LIMIT_MS,
    wordCount: WORD_COUNT,
  }
}

const OppositeClick: React.FC<Props> = ({ onSubmitSuccess }) => {
  const [phase, setPhase] = useState<Phase>("idle")
  const [roundNumber, setRoundNumber] = useState(1)
  const [roundData, setRoundData] = useState<Round | null>(null)
  const [roundLeftMs, setRoundLeftMs] = useState(2000)
  const [remainingMs, setRemainingMs] = useState(SESSION_DURATION_MS)
  const [cleared, setCleared] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [score, setScore] = useState(0)
  const [avgMs, setAvgMs] = useState<number | null>(null)
  const [bestMs, setBestMs] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [nickname, setNickname] = useState("")
  const [last4, setLast4] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState<boolean | null>(null)
  const [finalized, setFinalized] = useState(false)

  const readyTimer = useRef<number | null>(null)
  const resultTimer = useRef<number | null>(null)
  const sessionEndRef = useRef<number | null>(null)
  const roundDeadlineRef = useRef<number | null>(null)
  const roundStartRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>("idle")
  const sumMsRef = useRef(0)
  const successCountRef = useRef(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const resetSession = useCallback(() => {
    setPhase("idle")
    setRoundNumber(1)
    setRoundData(null)
    setRoundLeftMs(TIME_LIMIT_MS)
    setRemainingMs(SESSION_DURATION_MS)
    setCleared(0)
    setAttempts(0)
    setStreak(0)
    setBestStreak(0)
    setScore(0)
    setAvgMs(null)
    setBestMs(null)
    setLastResult(null)
    setSubmitOk(null)
    setFinalized(false)
    sumMsRef.current = 0
    successCountRef.current = 0
    sessionEndRef.current = null
    roundDeadlineRef.current = null
    roundStartRef.current = null
    if (readyTimer.current) window.clearTimeout(readyTimer.current)
    if (resultTimer.current) window.clearTimeout(resultTimer.current)
  }, [])

  const finishSession = useCallback(() => {
    if (phaseRef.current === "finished") return
    setPhase("finished")
    setFinalized(true)
    sessionEndRef.current = null
  }, [])

  const prepRound = useCallback(
    (nextRound: number, keepStreak: number) => {
      const endAt = sessionEndRef.current
      if (!endAt) return
      const left = endAt - performance.now()
      if (left <= 0) {
        finishSession()
        return
      }
      const data = buildRound({
        roundNumber: nextRound,
        streak: keepStreak,
      })
      setRoundNumber(nextRound)
      setRoundData(data)
      setRoundLeftMs(data.timeLimitMs)
      setPhase("ready")
      roundDeadlineRef.current = null
      roundStartRef.current = null
      if (readyTimer.current) window.clearTimeout(readyTimer.current)
      readyTimer.current = window.setTimeout(() => {
        setPhase("playing")
        roundStartRef.current = performance.now()
        roundDeadlineRef.current =
          (roundStartRef.current || performance.now()) + data.timeLimitMs
        setRoundLeftMs(data.timeLimitMs)
      }, 900)
    },
    [finishSession]
  )

  const startGame = useCallback(() => {
    resetSession()
    const endAt = performance.now() + SESSION_DURATION_MS
    sessionEndRef.current = endAt
    setRemainingMs(SESSION_DURATION_MS)
    setPhase("ready")
    prepRound(1, 0)
  }, [prepRound, resetSession])

  const completeRound = useCallback(
    (picked: string | null, reason: "select" | "timeout") => {
      if (phaseRef.current !== "playing" || !roundData) return
      const now = performance.now()
      const elapsed = Math.max(0, now - (roundStartRef.current || now))
      const success = picked === roundData.correct
      const nextStreak = success ? streak + 1 : 0
      const nextBestStreak = Math.max(bestStreak, nextStreak)

      setAttempts(a => a + 1)
      if (success) {
        setCleared(c => c + 1)
        setScore(
          prev =>
            prev +
            calcRoundScore({
              elapsedMs: elapsed,
              streak: nextStreak,
              timeLimit: roundData.timeLimitMs,
            })
        )
        sumMsRef.current += elapsed
        successCountRef.current += 1
        const avg = sumMsRef.current / Math.max(1, successCountRef.current)
        setAvgMs(avg)
        setBestMs(prev => (prev == null ? elapsed : Math.min(prev, elapsed)))
      }
      setStreak(nextStreak)
      setBestStreak(nextBestStreak)
      setLastResult({
        success,
        picked,
        correct: roundData.correct,
        elapsedMs: elapsed,
        twist: roundData.twist,
        reason,
      })
      setPhase("result")
      if (resultTimer.current) window.clearTimeout(resultTimer.current)
      resultTimer.current = window.setTimeout(() => {
        const endAt = sessionEndRef.current
        if (!endAt || performance.now() >= endAt - 200) {
          finishSession()
          return
        }
        prepRound(roundNumber + 1, nextStreak)
      }, 520)
    },
    [bestStreak, finishSession, prepRound, roundData, roundNumber, streak]
  )

  useEffect(() => {
    if (phase === "idle" || phase === "finished") return
    let raf: number
    const tick = () => {
      const endAt = sessionEndRef.current
      if (endAt) {
        const left = Math.max(0, endAt - performance.now())
        setRemainingMs(left)
        if (left <= 0) {
          finishSession()
          return
        }
      }
      if (phaseRef.current === "playing" && roundDeadlineRef.current) {
        const leftRound = Math.max(
          0,
          roundDeadlineRef.current - performance.now()
        )
        setRoundLeftMs(leftRound)
        if (leftRound <= 0) {
          completeRound(null, "timeout")
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [completeRound, finishSession, phase])

  const accuracy = useMemo(() => {
    if (!attempts) return 0
    return Math.round((cleared / attempts) * 100)
  }, [attempts, cleared])

  const lastMessage = useMemo(() => {
    if (!lastResult) return ""
    if (lastResult.success) {
      if (lastResult.twist === "truth") {
        return truthSuccessMsgs[
          Math.floor(Math.random() * truthSuccessMsgs.length)
        ]
      }
      return successMsgs[Math.floor(Math.random() * successMsgs.length)]
    }
    if (lastResult.twist === "truth") {
      return truthFailMsgs[Math.floor(Math.random() * truthFailMsgs.length)]
    }
    return failMsgs[Math.floor(Math.random() * failMsgs.length)]
  }, [lastResult])

  const canSubmit =
    finalized &&
    score > 0 &&
    nickname.trim().length >= 2 &&
    last4.trim().length === 4 &&
    !submitting

  const submitScore = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const ok = await submitOppositeClickScore({
        nickname: nickname.trim(),
        last4: last4.trim(),
        score,
        rounds: cleared,
        streak: bestStreak,
        reactionMs: avgMs != null ? Math.round(avgMs) : null,
      })
      setSubmitOk(ok)
      if (ok) {
        onSubmitSuccess?.()
      }
    } catch {
      setSubmitOk(false)
    } finally {
      setSubmitting(false)
    }
  }, [
    avgMs,
    bestStreak,
    canSubmit,
    cleared,
    last4,
    nickname,
    onSubmitSuccess,
    score,
  ])

  const handleLast4Change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D+/g, "").slice(0, 4)
      setLast4(digits)
    },
    []
  )

  const handleLast4Paste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const digits = e.clipboardData
        .getData("text")
        .replace(/\D+/g, "")
        .slice(0, 4)
      if (digits) setLast4(digits)
    },
    []
  )

  const roundRatio = roundData ? roundLeftMs / roundData.timeLimitMs : 0
  const totalRatio = remainingMs / SESSION_DURATION_MS

  return (
    <Wrapper>
      <h1 style={{ margin: 0, color: "#1b1b1b" }}>반대로 클릭하기</h1>
      <Panel>
        <span>
          남은 시간: <Stat>{formatSeconds(remainingMs)}</Stat>
        </span>
        <span>
          점수: <Stat>{score}</Stat>
        </span>
        <span>
          통과 라운드: <Stat>{cleared}</Stat>
        </span>
        <span>
          연속 성공: <Stat>{streak}</Stat>
        </span>
        <span>
          최고 연속: <Stat>{bestStreak}</Stat>
        </span>
      </Panel>
      {phase !== "idle" && phase !== "finished" ? (
        <div style={{ display: "grid", gap: 8, width: "min(640px,96vw)" }}>
          <div
            style={{
              height: 8,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(1, totalRatio)) * 100}%`,
                height: "100%",
                background: "#22c55e",
                transition: "width 120ms linear",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: "#374151",
              fontWeight: 700,
            }}
          >
            <span>90초 타이머</span>
            <span>{formatSeconds(remainingMs)}</span>
          </div>
        </div>
      ) : null}

      {phase === "idle" ? (
        <>
          <div
            style={{
              width: "min(640px, 96vw)",
              background: "#ffffff",
              color: "#1b1b1b",
              borderRadius: "12px",
              padding: "16px 18px",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#475569",
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              규칙 요약
            </div>
            <div style={{ color: "#374151", lineHeight: 1.6, fontWeight: 700 }}>
              - 기본은 <strong>반대로 클릭</strong>! 가끔은 ⚡ 정말로 맞추기.
              <br />- 라운드마다 제한 시간 {TIME_LIMIT_MS / 1000}초, 총 90초
              타임어택.
            </div>
          </div>
          <PrimaryBtn onClick={startGame}>게임 시작</PrimaryBtn>
        </>
      ) : null}

      {phase !== "idle" && phase !== "finished" && roundData ? (
        <>
          <Card accent={roundData.twist === "truth" ? "truth" : undefined}>
            <PromptLabel>
              <span>{roundData.prompt}</span>
              {roundData.twist === "truth" ? "⚡" : "↕"}
            </PromptLabel>
            <DisplayWord>{roundData.displayWord}</DisplayWord>
            <TimerRow>
              <TimerBar>
                <TimerFill ratio={roundRatio} danger={roundRatio < 0.35} />
              </TimerBar>
              <div style={{ fontWeight: 800, color: "#1b1b1b" }}>
                {Math.max(0, Math.ceil(roundLeftMs / 100) / 10).toFixed(1)}s
              </div>
            </TimerRow>
            <div style={{ color: "#374151", fontWeight: 700 }}>
              {phase === "ready"
                ? "준비!"
                : phase === "result"
                ? lastMessage
                : "제한 시간 안에 클릭"}
            </div>
          </Card>

          <OptionGrid>
            {roundData.options.map(opt => {
              let state: "idle" | "correct" | "wrong" = "idle"
              if (phase === "result" && lastResult) {
                if (opt === lastResult.correct) state = "correct"
                else if (opt === lastResult.picked) state = "wrong"
              }
              return (
                <OptionBtn
                  key={opt}
                  state={state}
                  disabled={phase !== "playing"}
                  onClick={() => completeRound(opt, "select")}
                  aria-label={`옵션 ${opt}`}
                >
                  {opt}
                </OptionBtn>
              )
            })}
          </OptionGrid>
        </>
      ) : null}

      {phase === "finished" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="oc-finish-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              background: "#1d1d1f",
              color: "#e6e6e6",
              padding: 20,
              borderRadius: 12,
              width: "min(460px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "grid",
              gap: 12,
            }}
          >
            <h2 id="oc-finish-title" style={{ margin: 0, color: "#fff" }}>
              최종 결과
            </h2>
            <div style={{ display: "grid", gap: 6, fontWeight: 700 }}>
              <div>
                점수: <span style={{ color: "#ffd561" }}>{score}</span>
              </div>
              <div>
                통과 라운드: <span style={{ color: "#ffd561" }}>{cleared}</span>
              </div>
              <div>
                시도: {attempts} · 정확도 {accuracy}%
              </div>
              <div>
                최고 연속:{" "}
                <span style={{ color: "#ffd561" }}>{bestStreak}</span>
              </div>
              <div>
                평균 반응:{" "}
                {avgMs != null ? (
                  <span style={{ color: "#ffd561" }}>
                    {Math.round(avgMs)}ms
                  </span>
                ) : (
                  "-"
                )}{" "}
                / 최고 반응:{" "}
                {bestMs != null ? (
                  <span style={{ color: "#ffd561" }}>
                    {Math.round(bestMs)}ms
                  </span>
                ) : (
                  "-"
                )}
              </div>
            </div>

            <div style={{ height: 1, background: "#374151", opacity: 0.5 }} />

            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="oc-nick" style={{ fontWeight: 800 }}>
                닉네임
              </label>
              <Input
                id="oc-nick"
                placeholder="2~16자 한/영/숫자"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={16}
              />
              <label htmlFor="oc-last4" style={{ fontWeight: 800 }}>
                휴대폰 뒷 4자리 (아무 숫자나 입력해도 됌 숫자만 입력 가능)
              </label>
              <Input
                id="oc-last4"
                placeholder="1234"
                value={last4}
                onChange={handleLast4Change}
                onPaste={handleLast4Paste}
                inputMode="numeric"
                pattern="[0-9]*"
                type="tel"
                maxLength={4}
              />
              <div style={{ color: "#9ca3af", fontSize: 12 }}>
                서버에 해시로만 저장되고 원문은 저장되지 않아요.
              </div>
            </div>

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <SecondaryBtn onClick={resetSession}>닫기</SecondaryBtn>
              <PrimaryBtn
                onClick={submitScore}
                disabled={!canSubmit}
                aria-label="기록 제출"
                style={{ background: "#60a5fa", color: "#fff" }}
              >
                {submitting
                  ? "제출 중..."
                  : submitOk === true
                  ? "제출 완료"
                  : "기록 제출"}
              </PrimaryBtn>
            </div>
            {submitOk === false ? (
              <div style={{ color: "#fca5a5", fontSize: 13 }}>
                제출에 실패했어요. 잠시 후 다시 시도해주세요.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default OppositeClick
