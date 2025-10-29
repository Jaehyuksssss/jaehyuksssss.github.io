import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
// page back button removed
import Template from "components/Common/Template"
import ReactionGame from "components/Game/ReactionGame"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import GoogleAdSense from "components/Common/GoogleAdSense"

/* page back button removed */

// Mobile-only ad container rendered above the game
const MobileAdContainer = styled.div`
  display: none;
  padding: 8px 16px 0;

  @media (max-width: 768px) {
    display: block;

    /* Ensure the ad doesn't overflow and keeps a banner shape */
    .adsbygoogle {
      max-width: 100% !important;
      max-height: 100px !important;
      overflow: hidden !important;
    }

    /* Google AdSense iframe size guard */
    iframe {
      max-width: 100% !important;
      max-height: 100px !important;
    }
  }
`

const ReactionPage: React.FC = () => {
  // reaction 페이지 조회수 카운트 (하루에 한 번만)
  useSupabaseViewCount("reaction", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  // Inside the game page, pressing browser back navigates to game list
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      navigate('/games', { replace: true })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <Template
      title="반응속도 테스트"
      description="30초 타임어택: 색이 다른 칸을 빠르게 찾아 클릭"
      url="/reaction"
    >
      {/* On mobile, place ad between back button (fixed) and the game title */}
      <MobileAdContainer>
        <GoogleAdSense
          adClient="ca-pub-3398641306673607"
          adSlot="2123128311"
          adFormat="auto"
          fullWidthResponsive={true}
        />
      </MobileAdContainer>
      <ReactionGame />
      {/* back button removed; use navbar */}
    </Template>
  )
}

export default ReactionPage
