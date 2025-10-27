import React from "react"
import Template from "components/Common/Template"

const PrivacyPage: React.FC = () => {
  return (
    <Template title="Privacy Policy" description="개인정보처리방침" url="/privacy">
      <article style={{ maxWidth: 840, margin: "0 auto", lineHeight: 1.8 }}>
        <h1>개인정보처리방침</h1>
        <p>본 사이트는 서비스 제공을 위해 필요한 최소한의 개인정보만을 수집·이용합니다.</p>
        <h2>수집 항목과 목적</h2>
        <ul>
          <li>접속 로그/쿠키: 서비스 품질 개선 및 통계 분석(익명) 목적</li>
        </ul>
        <h2>보관 및 파기</h2>
        <p>관련 법령에서 정한 기간 보관 후 지체 없이 파기합니다.</p>
        <h2>제3자 제공</h2>
        <p>법령에 의한 경우를 제외하고 제3자에게 제공하지 않습니다.</p>
        <h2>문의</h2>
        <p>개인정보 관련 문의는 Contact 페이지를 통해 접수 바랍니다.</p>
        <p style={{ color: "#6b7280" }}>본 문서는 가이드용 기본안이며, 운영 정책에 따라 수시로 갱신될 수 있습니다.</p>
      </article>
    </Template>
  )
}

export default PrivacyPage

