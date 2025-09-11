import React, { FunctionComponent, ReactNode } from "react"
import styled from "@emotion/styled"
import GlobalStyle from "components/Common/GlobalStyle"
import Footer from "components/Common/Footer"
import GoogleTagManager, { GoogleTagManagerBody } from "components/Common/GoogleTagManager"
import { Helmet } from "react-helmet"
// import Menu from "./Menu"

type TemplateProps = {
  title: string
  description: string
  url: string
  image: string
  children: ReactNode
}

const Container = styled.main`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const Template: FunctionComponent<TemplateProps> = function ({
  title,
  description,
  url,
  image,
  children,
}) {
  // Google Tag Manager Container ID (환경변수에서 가져오거나 하드코딩)
  const GTM_CONTAINER_ID = process.env.GATSBY_GTM_CONTAINER_ID || 'GTM-TSGR8WXK'

  return (
    <Container>
      <Helmet>
        <title>{title}</title>

        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html;charset=UTF-8" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content={title} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        <meta name="twitter:site" content="@사용자이름" />
        <meta name="twitter:creator" content="@사용자이름" />

        <html lang="ko" />
      </Helmet>
      <GoogleTagManager containerId={GTM_CONTAINER_ID} />
      <GoogleTagManagerBody containerId={GTM_CONTAINER_ID} />
      {/* <Menu /> */}
      <GlobalStyle />
      {children}
      <Footer />
    </Container>
  )
}

export default Template
