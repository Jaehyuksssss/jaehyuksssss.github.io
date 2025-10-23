import React from 'react'
import styled from '@emotion/styled'
import { navigate } from 'gatsby'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import Template from 'components/Common/Template'
import ReactionGame from 'components/Game/ReactionGame'

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

const ReactionPage: React.FC = () => {
  return (
    <Template title="반응속도 테스트" description="30초 타임어택: 색이 다른 칸을 빠르게 찾아 클릭" url="/reaction">
      <ReactionGame />
      <TopBackButton aria-label="홈으로 이동" title="홈으로 이동" onClick={() => navigate('/')}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </TopBackButton>
    </Template>
  )
}

export default ReactionPage
