import React from "react"
import styled from "@emotion/styled"
import { Link, navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat( auto-fit, minmax(220px, 1fr) );
  gap: 16px;
  margin-top: 12px;
`

const Card = styled(Link)`
  display: block;
  background: #1d1d1f;
  color: #e6e6e6;
  padding: 16px;
  border-radius: 12px;
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(0,0,0,0.24);
  transition: transform .12s ease, box-shadow .12s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,0.28); }
  &:active { transform: translateY(0); }
`

const Title = styled.h2`
  margin: 0 0 6px;
  color: #fff;
`

const Desc = styled.p`
  margin: 0;
  color: #bdbdbd;
`

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
  &:active { transform: scale(0.96); box-shadow: 0 0 8px rgba(0, 0, 0, 0.3); }
  @media (max-width: 768px) {
    top: 70px; left: 10px; width: 30px; height: 30px; font-size: 16px;
  }
`

const MobileAdContainer = styled.div`
  display: none;
  padding: 8px 16px 0;
  @media (max-width: 768px) {
    display: block;
    .adsbygoogle { max-width: 100% !important; max-height: 100px !important; overflow: hidden !important; }
    iframe { max-width: 100% !important; max-height: 100px !important; }
  }
`

const GamesPage: React.FC = () => {
  return (
    <Template title="게임" description="반응속도, 경로기억 등 미니게임 리스트" url="/games">
      <h1 style={{ marginTop: 0 }}>게임 리스트</h1>
      <Grid>
        <Card to="/reaction">
          <Title>반응속도 테스트</Title>
          <Desc>색이 다른 타일을 빠르게 찾아 클릭</Desc>
        </Card>
        <Card to="/trace">
          <Title>경로 그리기</Title>
          <Desc>3초 미리보기 후 기억한 순서대로 점을 연결</Desc>
        </Card>
      </Grid>

      {/* <TopBackButton aria-label="홈으로" title="홈으로" onClick={() => navigate("/")}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </TopBackButton> */}

      <MobileAdContainer>
        <GoogleAdSense
          adClient="ca-pub-3398641306673607"
          adSlot="2123128311"
          adFormat="auto"
          fullWidthResponsive={true}
        />
      </MobileAdContainer>
    </Template>
  )
}

export default GamesPage
