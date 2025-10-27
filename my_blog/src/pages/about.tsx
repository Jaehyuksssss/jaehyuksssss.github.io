import React from "react"
import Template from "components/Common/Template"

const AboutPage: React.FC = () => {
  return (
    <Template title="About" description="사이트 소개" url="/about">
      <article style={{ maxWidth: 840, margin: "0 auto", lineHeight: 1.8 }}>
        <h1>About</h1>
        <p>임재혁의 개인 기술 블로그입니다. 개발 관련 기록과 간단하게 즐길 수 있는 미니 게임을 만듭니다.</p>
        <p>Next/React, 웹 성능/접근성, 클라우드/CI/CD 등에 관심이 있습니다.</p>
      </article>
    </Template>
  )
}

export default AboutPage

