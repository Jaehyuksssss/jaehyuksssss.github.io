import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import MoleGame from "components/Game/MoleGame"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

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

const MolePage: React.FC = () => {
  useSupabaseViewCount("mole", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const onPop = () => navigate("/games", { replace: true })
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  return (
    <Template
      title="뉴트리아 잡기"
      description="라운드마다 더 빨라지는 두더지 잡아요"
      url="/mole"
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
      <MoleGame initialGrid={3} maxGrid={6} requiredPerRound={5} />
    </Template>
  )
}

export default MolePage
