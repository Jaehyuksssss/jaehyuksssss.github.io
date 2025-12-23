import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import OmokGame from "components/Game/OmokGame"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

const MobileAdContainer = styled.div`
  display: block;
  padding: 8px 16px 0;
  min-height: 120px;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.3s ease;

  @media (min-width: 769px) {
    display: none;
  }

  @media (max-width: 768px) {
    visibility: visible;
    opacity: 1;

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

const OmokPage: React.FC = () => {
  useSupabaseViewCount("omok", {
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
      title="오목 게임"
      description="컴퓨터와 대전하는 오목 게임. 2인 대전, 난이도 선택, 렌주룰 지원"
      url="/omok"
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
      <OmokGame />
    </Template>
  )
}

export default OmokPage
