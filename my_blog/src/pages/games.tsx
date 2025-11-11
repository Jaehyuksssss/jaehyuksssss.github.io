import React from "react"
import styled from "@emotion/styled"
import { Link, navigate } from "gatsby"
import Template from "components/Common/Template"
import GoogleAdSense from "components/Common/GoogleAdSense"
// back button removed on this page

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-top: 18px;
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

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 0;
  margin-bottom: 6px;
  flex-wrap: wrap;
`

const ActionBtn = styled(Link)`
  display: inline-block;
  text-decoration: none;
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: 10px;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.28), 0 2px 8px rgba(0, 0, 0, 0.12);
  &:active {
    transform: translateY(1px);
  }
`

const GamesPage: React.FC = () => {
  return (
    <Template
      title="재니 게임 천국"
      description="반응속도, 경로기억 등 미니게임 리스트"
      url="/games"
    >
      <HeaderRow>
        <h1 style={{ marginTop: 0 }}>재니 게임 천국</h1>
        <ActionBtn to="/games/feedback">피드백 남기기</ActionBtn>
      </HeaderRow>
      <Grid>
        <Card to="/reaction">
          <Title>반응속도 테스트</Title>
          <Desc>색이 다른 타일을 빠르게 찾아 클릭</Desc>
        </Card>
        <Card to="/time">
          <Title>시간 맞추기</Title>
          <Desc>정확한 시간에 멈추기</Desc>
        </Card>
        <Card to="/slice">
          <Title>떨어지는 공 베기</Title>
          <Desc>스와이프로 공을 베어 점수 획득</Desc>
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
          <Title>두더지 잡기</Title>
          <Desc>라운드마다 더 빨라지는 두더지 잡아요</Desc>
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
      {/* CTA moved to header row above */}
    </Template>
  )
}

export default GamesPage
