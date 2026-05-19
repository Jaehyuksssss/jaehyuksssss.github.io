import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import MicroStorm from "components/Game/MicroStorm"
import { fetchTopStormScores, StormScore } from "lib/stormApi"

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

const StormPage: React.FC = () => {
  useSupabaseViewCount("storm", { coolDownMinutes: 60 * 24, globalCoolDown: true })
  const [scores, setScores] = React.useState<StormScore[]>([])

  const load = React.useCallback(async () => fetchTopStormScores(10), [])
  const refresh = React.useCallback(() => { load().then(setScores) }, [load])

  React.useEffect(() => {
    let alive = true
    load().then(r => { if (alive) setScores(r) })
    return () => { alive = false }
  }, [load])

  return (
    <Template
      title="미니 태풍 피하기"
      description="드래그로 피해서 오래 살아남기!"
      url="/storm"
      hideGameButton
    >
      <Board>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: '0 0 6px' }}>리더보드 TOP 10</h3>
          <a href="#" onClick={(e) => { e.preventDefault(); refresh() }} style={{ fontSize: 12 }}>새로고침</a>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          <strong>등수 · 닉네임 · 점수</strong> 생존 시간이 길고, 피하기 실력이 좋을수록 높아요.
        </div>
        {scores && scores.length > 0 ? (
          <>
            {scores.map((s, i) => (
              <Row key={`${s.nickname}-${i}`}>
                <div>{s.rank}등 {s.nickname}님</div>
                <div style={{ color: '#16a34a' }}>{s.best_score}</div>
                <div style={{ color: '#2563eb' }}>{Math.ceil((s.best_survive_ms||0)/1000)}s</div>
              </Row>
            ))}
          </>
        ) : (
          <div style={{ color: '#6b7280', fontWeight: 600, padding: '6px 0' }}>아직 기록이 없어요</div>
        )}
      </Board>

      <MicroStorm />
    </Template>
  )
}

export default StormPage

