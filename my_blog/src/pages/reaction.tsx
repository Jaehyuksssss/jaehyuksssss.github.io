import React from 'react'
import Template from 'components/Common/Template'
import ReactionGame from 'components/Game/ReactionGame'

const ReactionPage: React.FC = () => {
  return (
    <Template title="반응속도 테스트" description="30초 타임어택: 색이 다른 칸을 빠르게 찾아 클릭" url="/reaction">
      <ReactionGame />
    </Template>
  )
}

export default ReactionPage
