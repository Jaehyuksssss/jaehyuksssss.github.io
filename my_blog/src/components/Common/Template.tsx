import React, { FunctionComponent, ReactNode } from "react"
import styled from "@emotion/styled"
import { graphql, useStaticQuery } from "gatsby"
import { Helmet } from "react-helmet"
import GlobalStyle from "components/Common/GlobalStyle"
import Footer from "components/Common/Footer"
import GoogleTagManager, {
  GoogleTagManagerBody,
} from "components/Common/GoogleTagManager"
import KakaoAdFit from "components/Common/KakaoAdFit"

type TemplateProps = {
  title?: string
  description?: string
  url?: string
  image?: string
  keywords?: string[]
  structuredData?: Array<Record<string, unknown>>
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
  keywords,
  structuredData,
  children,
}) {
  const {
    site: {
      siteMetadata: {
        title: siteTitle = "",
        description: siteDescription = "",
        author = "",
        siteUrl = "",
      } = {},
    } = {},
  } = useStaticQuery(graphql`
    query TemplateSiteMetadata {
      site {
        siteMetadata {
          title
          description
          author
          siteUrl
        }
      }
    }
  `)

  // Google Tag Manager Container ID (환경변수에서 가져오거나 하드코딩)
  const GTM_CONTAINER_ID = process.env.GATSBY_GTM_CONTAINER_ID || "GTM-TSGR8WXK"

  const normalizedBaseUrl = siteUrl ? siteUrl.replace(/\/$/, "") : ""
  const normalizeUrl = (value?: string) => {
    if (!value) return normalizedBaseUrl
    if (value.startsWith("http")) return value
    if (!normalizedBaseUrl) return value

    const baseForUrl = normalizedBaseUrl.endsWith("/")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/`

    try {
      const relative = value.startsWith("/") ? value : `./${value}`
      return new URL(relative, baseForUrl).toString()
    } catch (error) {
      const sanitizedFallback = value.startsWith("/") ? value : `/${value}`
      return `${normalizedBaseUrl}${sanitizedFallback}`
    }
  }

  const metaTitle = title || siteTitle
  const metaDescription = description || siteDescription
  const canonicalUrl = normalizeUrl(url)

  const metaImage = image ? normalizeUrl(image) : undefined
  const twitterCardType = metaImage ? "summary_large_image" : "summary"

  const websiteStructuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: normalizedBaseUrl,
    name: siteTitle,
    description: siteDescription,
    inLanguage: "ko-KR",
  }

  if (author) {
    websiteStructuredData.author = {
      "@type": "Person",
      name: author,
    }
  }

  const combinedStructuredData = [
    websiteStructuredData,
    ...(structuredData || []),
  ].filter(Boolean)

  const twitterHandle = author.startsWith("@")
    ? author
    : author
    ? `@${author}`
    : undefined

  return (
    <Container>
      <Helmet htmlAttributes={{ lang: "ko" }}>
        <title>{metaTitle}</title>

        <meta name="description" content={metaDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html;charset=UTF-8" />
        <meta name="robots" content="index,follow" />
        {author && <meta name="author" content={author} />}
        {keywords && keywords.length > 0 && (
          <meta name="keywords" content={keywords.join(", ")} />
        )}
        <meta
          name="google-site-verification"
          content="2XGKoH473RZiKP8024Go5wI4pAFPVu6DcfXHLtnr5VI"
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={siteTitle} />
        <meta property="og:locale" content="ko_KR" />
        {metaImage && <meta property="og:image" content={metaImage} />}

        <meta name="twitter:card" content={twitterCardType} />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {metaImage && <meta name="twitter:image" content={metaImage} />}
        {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
        {twitterHandle && (
          <meta name="twitter:creator" content={twitterHandle} />
        )}

        <link rel="canonical" href={canonicalUrl} />

        {combinedStructuredData.map((jsonLd, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        ))}
      </Helmet>
      <KakaoAdFit adUnit="DAN-qd2Zqldrfb5gWCyl" width={160} height={600} />
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
