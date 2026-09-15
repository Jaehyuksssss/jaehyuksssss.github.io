import React from "react"
import Template from "components/Common/Template"
import ArcadeFootball from "components/Game/ArcadeFootball"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

const FootballPage: React.FC = () => {
  useSupabaseViewCount("football", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  return (
    <Template
      title="THREE ON THREE - 3대3 스트리트 풋볼"
      description="패스하고 강슛을 날리는 90초 탑다운 3대3 아케이드 축구게임"
      url="/football"
      image="/football-og.png"
      keywords={["축구게임", "3대3 축구", "웹게임", "아케이드 게임"]}
      hideGameButton
    >
      <ArcadeFootball />
    </Template>
  )
}

export default FootballPage
