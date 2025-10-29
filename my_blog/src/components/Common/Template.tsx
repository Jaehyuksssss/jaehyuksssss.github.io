import React, { FunctionComponent, ReactNode } from "react"
import { useLocation } from '@reach/router'
import styled from "@emotion/styled"
import { graphql, useStaticQuery } from "gatsby"
import { Helmet } from "react-helmet"
import GlobalStyle from "components/Common/GlobalStyle"
import Footer from "components/Common/Footer"
import GoogleTagManager, {
  GoogleTagManagerBody,
} from "components/Common/GoogleTagManager"
import GoogleAdSense from "components/Common/GoogleAdSense"
import FloatingGameButton from "components/Common/FloatingGameButton"
// no navigate import needed here
// removed global back button imports

type TemplateProps = {
  title?: string
  description?: string
  url?: string
  image?: string
  keywords?: string[]
  structuredData?: Array<Record<string, unknown>>
  hideGameButton?: boolean
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
  /* 고정된 카테고리 헤더(80px + 헤더 높이 약 60px)를 피해 여백 확대 */
  padding-top: 180px;

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

/* Global back button removed */

// Desktop-only inline links
const DesktopLinks = styled.div`
  display: none;
  gap: 16px;
  align-items: center;
  @media (min-width: 769px) {
    display: flex;
  }
`

// Mobile-only hamburger toggle (left aligned)
const MobileToggleBtn = styled.button`
  position: absolute;
  left: 12px;
  top: 10px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  display: none;
  @media (max-width: 768px) {
    display: grid;
    place-items: center;
  }
`

// Mobile-only full overlay + panel menu
const MobileMenuOverlay = styled.div`
  position: fixed;
  inset: 60px 0 0 0; /* below navbar */
  background: rgba(0,0,0,0.25);
  z-index: 1999;
  display: none;
  @media (max-width: 768px) {
    display: block;
  }
`

const MobileMenuPanel = styled.div`
  position: absolute;
  inset: 0; /* fill overlay area */
  background: #ffffff;
  border-radius: 0; /* full-bleed */
  box-shadow: none;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: center;
  justify-content: center;
`

const MobileMenuLink = styled.a`
  text-decoration: none;
  color: #1b1b1b;
  font-weight: 800;
  letter-spacing: 1.6px;
  padding: 12px 8px;
  font-size: 20px;
  border-radius: 8px;
  &:active { background: #eff6ff; }
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
  hideGameButton,
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

  // Current route (for conditionally hiding floating button)
  const location = useLocation()
  const isReactionPage = Boolean(location && location.pathname && location.pathname.startsWith('/reaction'))
  const isTracePage = Boolean(location && location.pathname && location.pathname.startsWith('/trace'))
  const isGamesPage = Boolean(location && location.pathname && location.pathname.startsWith('/games'))
  const isHomePage = Boolean(location && location.pathname === '/')
  const shouldHideGameButton = Boolean(hideGameButton || isReactionPage || isTracePage || isGamesPage)
  const [navOpen, setNavOpen] = React.useState(false) // 모바일 전용 상태

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
      {/* Top navigation */}
      <nav
        aria-label="Global"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
          borderBottom: "1px solid #eee",
          zIndex: 2000,
          }}
      >
        {/* Desktop always-visible links */}
        <DesktopLinks>
          <a href="/" style={{ fontWeight: 900, color: "#111", textDecoration: "none" }}>Home</a>
          <a href="/games" style={{ fontWeight: 800, color: "#111", textDecoration: "none" }}>Games</a>
          <a href="/about" style={{ color: "#1f2937", textDecoration: "none" }}>About</a>
          <a href="/contact" style={{ color: "#1f2937", textDecoration: "none" }}>Contact</a>
          <a href="/privacy" style={{ color: "#1f2937", textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ color: "#1f2937", textDecoration: "none" }}>Terms</a>
        </DesktopLinks>

        {/* Mobile hamburger (left) */}
        <MobileToggleBtn
          aria-label={navOpen ? '메뉴 접기' : '메뉴 펼치기'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(v => !v)}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{navOpen ? '×' : '≡'}</span>
        </MobileToggleBtn>
      </nav>

      {/* Mobile overlay menu */}
      {navOpen && (
        <MobileMenuOverlay onClick={() => setNavOpen(false)}>
          <MobileMenuPanel onClick={e => e.stopPropagation()}>
            <MobileMenuLink href="/" onClick={() => setNavOpen(false)}>Home</MobileMenuLink>
            <MobileMenuLink href="/games" onClick={() => setNavOpen(false)}>Games</MobileMenuLink>
            <MobileMenuLink href="/about" onClick={() => setNavOpen(false)}>About</MobileMenuLink>
            <MobileMenuLink href="/contact" onClick={() => setNavOpen(false)}>Contact</MobileMenuLink>
            <MobileMenuLink href="/privacy" onClick={() => setNavOpen(false)}>Privacy</MobileMenuLink>
            <MobileMenuLink href="/terms" onClick={() => setNavOpen(false)}>Terms</MobileMenuLink>
          </MobileMenuPanel>
        </MobileMenuOverlay>
      )}

      {/* <Menu /> */}
      <GlobalStyle />

      {/* {shouldShowGlobalBack && (
        <TopBackButton
          aria-label="뒤로가기"
          title="뒤로가기"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              window.history.back()
            } else {
              navigate('/')
            }
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </TopBackButton>
      )} */}

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
      {/* Floating game entry button.
          - Hidden on /reaction and when explicitly requested
          - Constrained to intro hero area only on the home page */}
      {!shouldHideGameButton && (
        <FloatingGameButton
          to="/games"
          label="게임"
          boundToSelector={isHomePage ? '#intro-hero-area' : undefined}
        />
      )}
    </Container>
  )
}

export default Template
