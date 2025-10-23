import React from 'react'
import Template from 'components/Common/Template'
import ReactionGame from 'components/Game/ReactionGame'

const ReactionPage: React.FC = () => {
  return (
    <Template title="반응속도 테스트" description="색이 다른 칸을 빠르게 찾아 클릭하는 반응속도 게임" url="/reaction">
      <ReactionGame rounds={5} grid={4} />
    </Template>
  )
}

export default ReactionPage

