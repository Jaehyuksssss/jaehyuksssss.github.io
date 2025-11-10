import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import TimeMatch from "components/Game/TimeMatch"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import { fetchTopTimeMatchScores, PublicScore } from "lib/timeMatchApi"

const Board = styled.div`
  width: min(560px, 92vw);
  margin: 10px auto 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  padding: 6px 0;
  font-weight: 700;
  color: #111;
`

const TimePage: React.FC = () => {
  useSupabaseViewCount("time", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })
  const [scores, setScores] = React.useState<PublicScore[]>([])

  const loadScores = React.useCallback(async () => {
    const result = await fetchTopTimeMatchScores(10)
    return result
  }, [])

  const refreshScores = React.useCallback(() => {
    loadScores().then(setScores)
  }, [loadScores])

  React.useEffect(() => {
    let alive = true
    loadScores().then(result => {
      if (alive) setScores(result)
    })
    return () => {
      alive = false
    }
  }, [loadScores])

  return (
    <Template
      title="시간 맞추기"
      description="정확한 시간에 멈추기"
      url="/time"
      hideGameButton
    >
      {/* Leader보드 (Top 10) */}
      <Board>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: "0 0 6px" }}>리더보드 TOP 10</h3>
          <a
            href="#"
            onClick={e => {
              e.preventDefault()
              refreshScores()
            }}
            style={{ fontSize: 12 }}
          >
            새로고침으로 갱신
          </a>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          <strong>등수 · 닉네임 · 평균 오차(ms)</strong> 오차가 낮을수록 순위가
          높아요.
        </div>
        {scores && scores.length > 0 ? (
          <>
            {scores.map((s, i) => (
              <Row key={`${s.nickname}-${i}`}>
                <div>
                  {s.rank}등 {s.nickname}님
                </div>
                <div style={{ color: "#2563eb" }}>{s.best_avg_ms}ms</div>
              </Row>
            ))}
          </>
        ) : (
          <div style={{ color: "#6b7280", fontWeight: 600, padding: "6px 0" }}>
            아직 기록이 없어요
          </div>
        )}
      </Board>

      <TimeMatch onSubmitSuccess={refreshScores} />
    </Template>
  )
}

export default TimePage
