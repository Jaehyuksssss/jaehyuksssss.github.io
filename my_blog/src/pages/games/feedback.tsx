import React from "react"
import styled from "@emotion/styled"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import FeedbackBoard from "components/Common/FeedbackBoard"

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

const GamesFeedbackPage: React.FC = () => {
  return (
    <Template
      title="게임 피드백"
      description="모든 게임에 대한 의견을 남겨주세요. 있으면 좋겠으면 하는 내용도 알려주세요. 추첨을 통해 스타벅스 기프티콘 증정!"
      url="/games/feedback"
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
      <FeedbackBoard />
    </Template>
  )
}

export default GamesFeedbackPage
