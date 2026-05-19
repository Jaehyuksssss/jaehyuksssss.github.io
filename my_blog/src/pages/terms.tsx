import React from "react"
import Template from "components/Common/Template"

const TermsPage: React.FC = () => {
  return (
    <Template title="Terms of Use" description="이용약관" url="/terms">
      <article style={{ maxWidth: 840, margin: "0 auto", lineHeight: 1.8 }}>
        <h1>이용약관</h1>
        <p>본 사이트 이용 시 아래 사항에 동의하는 것으로 간주합니다.</p>
        <ul>
          <li>게임 페이지 데이터는 통계적 목적으로 익명 처리될 수 있습니다.</li>
        </ul>
        <p style={{ color: "#6b7280" }}>운영 정책에 따라 약관은 갱신될 수 있습니다.</p>
      </article>
    </Template>
  )
}

export default TermsPage

