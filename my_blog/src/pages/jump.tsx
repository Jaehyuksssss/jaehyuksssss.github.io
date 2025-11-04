import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import MinimalRunner from "components/Game/MinimalRunner"

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

const MinimalRunnerPage: React.FC = () => {
  useSupabaseViewCount("jump", {
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
      title="뛰 뛰 뛰어~"
      description="스페이스/터치로 더블 점프! 장애물을 피해 오래 달려요"
      url="/jump"
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
      <MinimalRunner />
    </Template>
  )
}

export default MinimalRunnerPage
