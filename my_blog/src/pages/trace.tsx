import React from "react"
import { navigate } from "lib/navigation"
// page back button removed
import Template from "components/Common/Template"
import TraceRunner from "components/Game/TraceRunner"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

/* page back button removed */

const TracePage: React.FC = () => {
  useSupabaseViewCount("trace", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  // Inside the game page, pressing browser back navigates to game list
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const onPop = () => {
      navigate("/games", { replace: true })
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  return (
    <Template
      title="연결 연결"
      description="기억력을 테스트 해봐요"
      url="/trace"
    >
      <TraceRunner previewMs={3000} startGrid={3} maxGrid={6} />
    </Template>
  )
}

export default TracePage
