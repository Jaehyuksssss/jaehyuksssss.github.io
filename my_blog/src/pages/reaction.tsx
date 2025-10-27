import React from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"
import Template from "components/Common/Template"
import ReactionGame from "components/Game/ReactionGame"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import GoogleAdSense from "components/Common/GoogleAdSense"

const TopBackButton = styled.button`
  position: fixed;
  top: 80px; /* below fixed navbar */
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
    top: 70px; /* below mobile navbar */
    left: 10px;
    width: 30px;
    height: 30px;
    font-size: 16px;
  }
`

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
      {/* <TopBackButton
        aria-label="게임 리스트로"
        title="게임 리스트로"
        onClick={() => navigate("/games")}
      >
        <FontAwesomeIcon icon={faArrowLeft} />
      </TopBackButton> */}
    </Template>
  )
}

export default ReactionPage
