import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import { fetchTopOppositeScores, OppositeScore } from "lib/oppositeClickApi"
import OppositeClick from "components/Game/OppositeClick"

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
  grid-template-columns: 1fr auto auto auto;
  gap: 8px;
  padding: 6px 0;
  font-weight: 700;
  color: #111;
`

const OppositePage: React.FC = () => {
  useSupabaseViewCount("opposite", { coolDownMinutes: 60 * 24, globalCoolDown: true })
  const [scores, setScores] = React.useState<OppositeScore[]>([])

  const load = React.useCallback(async () => fetchTopOppositeScores(10), [])
  const refresh = React.useCallback(() => {
    load().then(setScores)
  }, [load])

  React.useEffect(() => {
    let alive = true
    load().then(result => {
      if (alive) setScores(result)
    })
    return () => {
      alive = false
    }
  }, [load])

  return (
    <Template
      title="반대로 클릭하기"
      description="반대말을 클릭! 가끔은 진짜로 맞추기"
      url="/opposite"
      hideGameButton
    >
      <Board>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: "0 0 6px" }}>리더보드 TOP 10</h3>
          <a
            href="#"
            onClick={e => {
              e.preventDefault()
              refresh()
            }}
            style={{ fontSize: 12 }}
          >
            새로고침
          </a>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
          <strong>등수 · 닉네임 · 점수 · 통과 라운드 · 최고 연속</strong> 점수가 같을 때는 라운드, 연속 성공, 반응속도 순으로 정렬돼요.
        </div>
        {scores && scores.length > 0 ? (
          <>
            {scores.map((s, i) => (
              <Row key={`${s.nickname}-${i}`}>
                <div>
                  {s.rank}등 {s.nickname}님
                </div>
                <div style={{ color: "#2563eb" }}>{s.best_score}</div>
                <div style={{ color: "#16a34a" }}>{s.best_rounds}R</div>
                <div style={{ color: "#f59e0b" }}>{s.best_streak}연속</div>
              </Row>
            ))}
          </>
        ) : (
          <div style={{ color: "#6b7280", fontWeight: 600, padding: "6px 0" }}>
            아직 기록이 없어요
          </div>
        )}
      </Board>

      <OppositeClick onSubmitSuccess={refresh} />
    </Template>
  )
}

export default OppositePage
