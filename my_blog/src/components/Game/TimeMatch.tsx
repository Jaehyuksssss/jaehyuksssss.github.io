import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "@emotion/styled"
import { submitTimeMatchScore } from "lib/timeMatchApi"

type Phase = "idle" | "running" | "round_result" | "finished"

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
  color: #1b1b1b;
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

const BigButton = styled.button<{ danger?: boolean }>`
  width: min(420px, 92vw);
  height: 120px;
  font-size: 28px;
  font-weight: 900;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  color: #111;
  background: ${({ danger }) => (danger ? "#fca5a5" : "#ffd561")};
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
  transition: transform 0.08s ease;
  &:active {
    transform: translateY(1px);
  }
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
`

const Hint = styled.div`
  color: #374151;
  font-size: 14px;
  opacity: 0.9;
`

const ResultBadge = styled.div<{ good?: boolean; perfect?: boolean }>`
  padding: 6px 10px;
  border-radius: 10px;
  font-weight: 900;
  color: ${({ perfect }) => (perfect ? "#111" : "#111")};
  background: ${({ perfect, good }) =>
    perfect ? "#86efac" : good ? "#bfdbfe" : "#fecaca"};
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
  background: #60a5fa;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
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

function pickTargetSec(): number {
  // 0.5s ~ 10.0s, step 0.1s (one decimal place)
  const min = 0.5
  const max = 10.0
  const raw = min + Math.random() * (max - min)
  return Math.round(raw * 10) / 10
}

function formatMs(n: number) {
  return `${Math.round(n)} ms`
}

function classify(ms: number) {
  if (ms <= 20) return { label: "Perfect", perfect: true }
  if (ms <= 50) return { label: "Great", good: true }
  if (ms <= 100) return { label: "Good" }
  return { label: "Miss" }
}

function now() {
  return performance.now()
}

const TimeMatch: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("idle")
  const [round, setRound] = useState(1)
  const [targetSec, setTargetSec] = useState<number>(pickTargetSec())
  const [manualMode, setManualMode] = useState(false)
  const [manualTargetSec, setManualTargetSec] = useState<number>(2.0)
  const [roundErrors, setRoundErrors] = useState<number[]>([])
  const [minError, setMinError] = useState<number | null>(null)
  const [lastError, setLastError] = useState<number | null>(null)
  const [lastDirection, setLastDirection] = useState<"fast" | "slow" | null>(
    null
  )
  const [canStopAt, setCanStopAt] = useState<number>(0)
  const [showPrep, setShowPrep] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const rafRef = useRef<number | null>(null)

  const startAtRef = useRef<number | null>(null)

  const avgError = useMemo(() => {
    if (!roundErrors.length) return 0
    return (
      roundErrors.reduce((a, b) => a + b, 0) / Math.max(1, roundErrors.length)
    )
  }, [roundErrors])

  const TOTAL_ROUNDS = 5

  const startRound = useCallback(() => {
    setShowPrep(true)
    window.setTimeout(() => {
      setShowPrep(false)
      setPhase("running")
      startAtRef.current = now()
      setCanStopAt(now() + 120)
      setElapsedMs(0)
    }, 1200)
  }, [])

  const stopRound = useCallback(() => {
    if (phase !== "running") return
    const started = startAtRef.current
    if (started == null) return
    if (now() < canStopAt) return
    const elapsed = now() - started
    const targetMs = targetSec * 1000
    const delta = Math.abs(elapsed - targetMs)
    const dir: "fast" | "slow" = elapsed < targetMs ? "fast" : "slow"
    setLastDirection(dir)
    setLastError(delta)
    setRoundErrors(prev => {
      const next = [...prev, delta]
      const m = Math.min(...next)
      setMinError(m)
      return next
    })
    setPhase("round_result")
  }, [phase, targetSec, canStopAt])

  const nextStep = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      setPhase("finished")
      return
    }
    setRound(r => r + 1)
    setTargetSec(
      manualMode
        ? Math.max(
            0.1,
            Math.min(10.0, Math.round((manualTargetSec || 2) * 10) / 10)
          )
        : pickTargetSec()
    )
    setLastError(null)
    setLastDirection(null)
    setPhase("idle")
  }, [round, manualMode, manualTargetSec])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      e.preventDefault()
      if (phase === "idle") startRound()
      else if (phase === "running") stopRound()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, startRound, stopRound])

  useEffect(() => {
    if (phase !== "running") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    const tick = () => {
      const s = startAtRef.current
      if (s != null) setElapsedMs(now() - s)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [phase])

  // Submit state
  const [nickname, setNickname] = useState("")
  const [last4, setLast4] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitOk, setSubmitOk] = useState<boolean | null>(null)
  const bestAvg = Math.round(avgError)
  const bestSingle = Math.round(minError ?? 0)

  const handleLast4Change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D+/g, "").slice(0, 4)
      setLast4(digits)
    },
    []
  )

  const handleLast4KeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const controlKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Home",
        "End",
      ]
      if (controlKeys.includes(e.key)) return
      if (e.key.length === 1 && /\d/.test(e.key)) return
      e.preventDefault()
    },
    []
  )

  const handleLast4Paste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData("text")
      const digits = pasted.replace(/\D+/g, "").slice(0, 4)
      if (digits) setLast4(digits)
    },
    []
  )

  const submitScore = useCallback(async () => {
    setSubmitting(true)
    try {
      const ok = await submitTimeMatchScore({
        nickname: nickname.trim(),
        last4: last4.trim(),
        avgMs: bestAvg,
        singleMs: bestSingle,
      })
      setSubmitOk(ok)
    } catch {
      setSubmitOk(false)
    } finally {
      setSubmitting(false)
    }
  }, [nickname, last4, bestAvg, bestSingle])

  return (
    <Wrapper>
      <h1 style={{ color: "#1b1b1b", margin: 0 }}>시간 맞추기</h1>
      <Panel>
        <span>
          라운드:{" "}
          <Stat>
            {round}/{TOTAL_ROUNDS}
          </Stat>
        </span>
        <span>
          평균 오차: <Stat>{formatMs(avgError)}</Stat>
        </span>
        <span>
          최소 오차: <Stat>{minError != null ? formatMs(minError) : "-"}</Stat>
        </span>
      </Panel>

      {phase === "idle" ? (
        <>
          <div style={{ display: "grid", gap: 8, placeItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#111" }}>
              이번 라운드 목표
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#111" }}>
              {targetSec.toFixed(1)}초
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 14,
                  color: "#374151",
                }}
              >
                <input
                  type="checkbox"
                  checked={manualMode}
                  onChange={e => setManualMode(e.target.checked)}
                />
                목표 직접 지정
              </label>
              {manualMode ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    max={10}
                    value={manualTargetSec}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v)) setManualTargetSec(v)
                    }}
                    style={{
                      width: 90,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button
                    onClick={() =>
                      setTargetSec(
                        Math.max(
                          0.1,
                          Math.min(
                            10.0,
                            Math.round((manualTargetSec || 2) * 10) / 10
                          )
                        )
                      )
                    }
                    style={{
                      border: "1px solid #9ca3af",
                      background: "white",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontWeight: 700,
                    }}
                  >
                    적용
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setTargetSec(pickTargetSec())}
                  style={{
                    border: "1px solid #9ca3af",
                    background: "white",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontWeight: 700,
                  }}
                >
                  랜덤 다시 뽑기
                </button>
              )}
            </div>
          </div>
          <BigButton onClick={startRound} aria-label="시작하기">
            시작하기
          </BigButton>
          <Hint>
            규칙: 목표 시간을 확인 → 시작 → 그 시간이 되면 멈추기 (스페이스바도
            가능)
          </Hint>
        </>
      ) : null}

      {phase === "running" ? (
        <>
          <div style={{ display: "grid", gap: 8, placeItems: "center" }}>
            <div style={{ fontSize: 14, color: "#4b5563" }}>
              지금이다 싶을 때 멈추기
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <div style={{ fontSize: 16, color: "#111", fontWeight: 900 }}>
                목표
              </div>
              <div style={{ fontSize: 28, color: "#111", fontWeight: 900 }}>
                {targetSec.toFixed(1)}초
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <div style={{ fontSize: 16, color: "#111", fontWeight: 900 }}>
                현재
              </div>
              <div style={{ fontSize: 28, color: "#111", fontWeight: 900 }}>
                {(elapsedMs / 1000).toFixed(2)}초
              </div>
            </div>
          </div>
          <BigButton danger onClick={stopRound} aria-label="멈추기">
            멈추기
          </BigButton>
        </>
      ) : null}

      {phase === "round_result" && lastError != null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tm-round-result"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={nextStep}
        >
          <div
            id="tm-round-result"
            style={{
              background: "#ffffff",
              color: "#111",
              padding: 20,
              borderRadius: 12,
              width: "min(420px, 92vw)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              display: "grid",
              gap: 10,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 10px" }}>결과</h2>
            <div>
              목표 {targetSec.toFixed(1)}초 →{" "}
              {lastDirection === "fast" ? "빠름" : "늦음"}
            </div>
            <ResultBadge {...classify(lastError)}>
              오차 {formatMs(lastError)}
            </ResultBadge>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <SecondaryBtn onClick={nextStep} aria-label="다음 라운드">
                다음
              </SecondaryBtn>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "finished" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tm-finish-title"
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
            <h2 id="tm-finish-title" style={{ margin: 0 }}>
              최종 결과
            </h2>
            <div style={{ display: "grid", gap: 6, fontWeight: 700 }}>
              <div>
                평균 오차:{" "}
                <span style={{ color: "#ffd561" }}>{formatMs(avgError)}</span>
              </div>
              <div>
                최소 오차:{" "}
                <span style={{ color: "#ffd561" }}>
                  {minError != null ? formatMs(minError) : "-"}
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: "#374151", opacity: 0.5 }} />

            <div style={{ display: "grid", gap: 8 }}>
              <label htmlFor="tm-nickname" style={{ fontWeight: 800 }}>
                닉네임
              </label>
              <Input
                id="tm-nickname"
                placeholder="2~16자 한/영/숫자"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={16}
              />
              <label htmlFor="tm-last4" style={{ fontWeight: 800 }}>
                휴대폰 뒷 4자리 (아무 숫자나 입력해도 됌 숫자만 입력 가능)
              </label>
              <Input
                id="tm-last4"
                placeholder="1234"
                value={last4}
                onChange={handleLast4Change}
                onKeyDown={handleLast4KeyDown}
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
              <SecondaryBtn onClick={() => location.reload()}>
                닫기
              </SecondaryBtn>
              <PrimaryBtn
                disabled={
                  submitting ||
                  nickname.trim().length < 2 ||
                  last4.trim().length !== 4
                }
                onClick={submitScore}
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

      {showPrep ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tm-prep-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3100,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#111",
              padding: 24,
              borderRadius: 16,
              width: "min(480px, 92vw)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
              textAlign: "center",
            }}
          >
            <div
              id="tm-prep-title"
              style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}
            >
              이번 라운드 목표
            </div>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 1 }}>
              {targetSec.toFixed(1)}초
            </div>
            <div style={{ marginTop: 8, color: "#4b5563" }}>
              1초 후 시작합니다.!
            </div>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

export default TimeMatch
