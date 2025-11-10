import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import TimeMatch from "components/Game/TimeMatch"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import { fetchTopTimeMatchScores, PublicScore } from "lib/timeMatchApi"

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

  React.useEffect(() => {
    let alive = true
    fetchTopTimeMatchScores(20).then(r => {
      if (alive) setScores(r)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <Template
      title="시간 맞추기"
      description="정확히 시간에 멈추기"
      url="/time"
      hideGameButton
    >
      <MobileAdContainer>
        <GoogleAdSense
          adClient="ca-pub-3398641306673607"
          adSlot="2123128311"
          adFormat="auto"
          fullWidthResponsive={true}
        />
      </MobileAdContainer>

      {/* Leaderboard (read-only) */}
      {scores && scores.length > 0 ? (
        <Board>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: "0 0 6px" }}>
              리더보드 TOP {Math.min(scores.length, 20)}
            </h3>
            <a
              href="#"
              onClick={e => {
                e.preventDefault()
                fetchTopTimeMatchScores(20).then(setScores)
              }}
              style={{ fontSize: 12 }}
            >
              새로고침
            </a>
          </div>
          {scores.map((s, i) => (
            <Row key={`${s.nickname}-${i}`}>
              <div>
                #{s.rank} {s.nickname}
              </div>
              <div style={{ color: "#2563eb" }}>{s.best_avg_ms}ms</div>
              <div style={{ color: "#059669" }}>{s.best_single_ms}ms</div>
            </Row>
          ))}
        </Board>
      ) : null}

      <TimeMatch />
    </Template>
  )
}

export default TimePage
