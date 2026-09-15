import React from "react"
import Template from "components/Common/Template"
import OfficeEscape from "components/Game/OfficeEscape"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

const EscapePage: React.FC = () => {
  useSupabaseViewCount("escape", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  return (
    <Template
      title="퇴근 1분 전"
      description="상사가 돌아보기 전에 멈춰라! 한 손으로 즐기는 몰래 퇴근 타이밍 게임"
      url="/escape"
      keywords={["퇴근 게임", "미니게임", "타이밍 게임", "웹게임"]}
      hideGameButton
    >
      <OfficeEscape />
    </Template>
  )
}

export default EscapePage
