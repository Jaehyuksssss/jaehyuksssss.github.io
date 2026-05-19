import React, { FunctionComponent } from "react"
import styled from "@emotion/styled"

const FooterWrapper = styled.footer`
  display: grid;
  place-items: center;
  margin-top: auto;
  padding: 50px 0;
  font-size: 15px;
  text-align: center;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`

const LinkRow = styled.div`
  margin-top: 10px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  a {
    color: #2563eb;
    text-decoration: none;
  }
`

const Footer: FunctionComponent = function () {
  return (
    <FooterWrapper>
      Thank You for Visiting My Blog 😎.
      <br />© 2022 Developer Jae Hyuk, Powered By Gatsby.
      <LinkRow>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms</a>
      </LinkRow>
    </FooterWrapper>
  )
}

export default Footer
