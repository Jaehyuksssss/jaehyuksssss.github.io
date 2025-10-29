import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
// page back button removed
import Template from "components/Common/Template"
import TraceRunner from "components/Game/TraceRunner"
import GoogleAdSense from "components/Common/GoogleAdSense"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

/* page back button removed */

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

const TracePage: React.FC = () => {
  useSupabaseViewCount("trace", { coolDownMinutes: 60 * 24, globalCoolDown: true })

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
    <Template title="연결 연결" description="기억력을 테스트 해봐요" url="/trace">
      <MobileAdContainer>
        <GoogleAdSense
          adClient="ca-pub-3398641306673607"
          adSlot="2123128311"
          adFormat="auto"
          fullWidthResponsive={true}
        />
      </MobileAdContainer>
      <TraceRunner previewMs={3000} startGrid={3} maxGrid={6} />

    </Template>
  )
}

export default TracePage
