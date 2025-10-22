import React, { FunctionComponent, ReactNode } from "react"
import styled from "@emotion/styled"
import { graphql, useStaticQuery } from "gatsby"
import { Helmet } from "react-helmet"
import GlobalStyle from "components/Common/GlobalStyle"
import Footer from "components/Common/Footer"
import GoogleTagManager, {
  GoogleTagManagerBody,
} from "components/Common/GoogleTagManager"
import GoogleAdSense from "components/Common/GoogleAdSense"

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

const MainLayout = styled.div`
  display: flex;
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const Sidebar = styled.aside`
  width: 200px;
  min-width: 200px;
  padding: 20px;
  padding-top: 120px; /* 메뉴바 높이만큼 여백 추가 */

  @media (max-width: 768px) {
    display: none;
  }
`

const ContentArea = styled.div`
  flex: 1;
  margin-top: 100px;

  @media (max-width: 768px) {
    padding: 10px;
  }
`

const MobileAdContainer = styled.div`
  display: none;
  padding: 10px 20px;
  margin-top: 80px; /* 메뉴바 높이만큼 여백 추가 */

  @media (max-width: 768px) {
    display: block;
    margin-top: 90px; /* 모바일 메뉴바 높이만큼 여백 추가 */

    /* 모바일 광고 크기 제한 */
    .adsbygoogle {
      max-width: 100% !important;
      max-height: 100px !important;
      overflow: hidden !important;
    }

    /* Google AdSense iframe 크기 제한 */
    iframe {
      max-width: 100% !important;
      max-height: 100px !important;
    }
  }
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
      <GoogleTagManager containerId={GTM_CONTAINER_ID} />
      <GoogleTagManagerBody containerId={GTM_CONTAINER_ID} />
      {/* <Menu /> */}
      <GlobalStyle />

      <MainLayout>
        <Sidebar>
          <GoogleAdSense
            adClient="ca-pub-3398641306673607"
            adSlot="2197868679"
            adFormat="auto"
            fullWidthResponsive={true}
          />
        </Sidebar>

        <ContentArea>{children}</ContentArea>

        <Sidebar>
          <GoogleAdSense
            adClient="ca-pub-3398641306673607"
            adSlot="2197868679"
            adFormat="auto"
            fullWidthResponsive={true}
          />
        </Sidebar>
      </MainLayout>

      <Footer />
    </Container>
  )
}

export default Template
