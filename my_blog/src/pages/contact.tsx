import React from "react"
import Template from "components/Common/Template"

const ContactPage: React.FC = () => {
  return (
    <Template title="Contact" description="문의하기" url="/contact">
      <article style={{ maxWidth: 840, margin: "0 auto", lineHeight: 1.8 }}>
        <h1>Contact</h1>
        <p>문의는 아래 채널로 부탁드립니다.</p>
        <ul>
          <li>GitHub: <a href="https://github.com/jaehyuksssss" target="_blank" rel="noopener noreferrer">@jaehyuksssss</a></li>
          <li>이메일: <a href="mailto:ljh9531009@gmail.com">ljh9531009@gmail.com</a></li>
        </ul>
      </article>
    </Template>
  )
}

export default ContactPage

