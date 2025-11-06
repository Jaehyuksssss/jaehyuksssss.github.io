import React from "react"
import styled from "@emotion/styled"
import { Link, navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
// back button removed on this page

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  }
  &:active {
    transform: translateY(0);
  }
`

const Title = styled.h2`
  margin: 0 0 6px;
  color: #fff;
`

const Desc = styled.p`
  margin: 0;
  color: #bdbdbd;
`

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

const GamesPage: React.FC = () => {
  return (
    <Template
      title="게임"
      description="반응속도, 경로기억 등 미니게임 리스트"
      url="/games"
    >
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
        <Card to="/jump">
          <Title>뛰 뛰 뛰어~</Title>
          <Desc>뛰어서, 얼마나 오래 버티나?</Desc>
        </Card>
        <Card to="/mole">
          <Title>뉴트리아 잡기</Title>
          <Desc>라운드마다 더 빨라지는 뉴트리아 잡아서 환경 보호해요</Desc>
        </Card>
      </Grid>

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
