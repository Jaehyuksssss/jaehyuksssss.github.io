import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import BallSlice from "components/Game/BallSlice"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import { fetchTopBallSliceScores, SliceScore } from "lib/ballSliceApi"

const MobileAdContainer = styled.div`
  display: none;
  padding: 8px 16px 0;
  @media (max-width: 768px) {
    display: block;
    .adsbygoogle {
      max-width: 100% !important;
      max-height: 100px !important;
      overflow: hidden !important;
    }
    iframe {
      max-width: 100% !important;
      max-height: 100px !important;
    }
  }
`

const SlicePage: React.FC = () => {
  useSupabaseViewCount("slice", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })
  const [scores, setScores] = React.useState<SliceScore[]>([])
  React.useEffect(() => {
    let alive = true
    fetchTopBallSliceScores(10).then(r => {
      if (alive) setScores(r)
    })
    return () => {
      alive = false
    }
  }, [])
  return (
    <Template
      title="떨어지는 공 베기"
      description="스와이프로 공을 베어 점수를 획득하세요"
      url="/slice"
      hideGameButton
    >
      {scores && scores.length > 0 ? (
        <div
          style={{
            width: "min(720px, 92vw)",
            margin: "6px auto 10px",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: "0 0 8px" }}>리더보드 TOP 10</h3>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                fetchTopBallSliceScores(10).then(setScores)
              }}
              style={{ fontSize: 12 }}
            >
              새로고침
            </a>
          </div>
          {scores.map((s, i) => (
            <div
              key={`${s.nickname}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                padding: "4px 0",
                fontWeight: 700,
              }}
            >
              <div>
                #{s.rank} {s.nickname}
              </div>
              <div style={{ color: "#22c55e" }}>{s.best_score}</div>
            </div>
          ))}
        </div>
      ) : null}
      <BallSlice />
    </Template>
  )
}

export default SlicePage
