import React from "react"
import Template from "components/Common/Template"
import FeedbackBoard from "components/Common/FeedbackBoard"

const GamesFeedbackPage: React.FC = () => {
  return (
    <Template
      title="게임 피드백"
      description="모든 게임에 대한 의견을 남겨주세요. 있으면 좋겠으면 하는 내용도 알려주세요. 추첨을 통해 스타벅스 기프티콘 증정!"
      url="/games/feedback"
      hideGameButton
    >
      <FeedbackBoard />
    </Template>
  )
}

export default GamesFeedbackPage
