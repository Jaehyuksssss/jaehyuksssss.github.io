import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"
import Template from "components/Common/Template"
import TraceRunner from "components/Game/TraceRunner"
import GoogleAdSense from "components/Common/GoogleAdSense"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

const TopBackButton = styled.button`
  position: fixed;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  color: #000000;
  font-size: 18px;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  z-index: 2100;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:active {
    transform: scale(0.96);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    top: 10px;
    left: 10px;
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
`

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

  return (
    <Template title="경로 그리기" description="5초간 경로 미리보기, 기억해 그리기!" url="/trace">
      <MobileAdContainer>
        <GoogleAdSense
          adClient="ca-pub-3398641306673607"
          adSlot="2123128311"
          adFormat="auto"
          fullWidthResponsive={true}
        />
      </MobileAdContainer>
      <TraceRunner previewMs={3000} startGrid={3} maxGrid={6} />
      <TopBackButton aria-label="홈으로 이동" title="홈으로 이동" onClick={() => navigate("/")}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </TopBackButton>
    </Template>
  )
}

export default TracePage
