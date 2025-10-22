import React, { useEffect, useState } from "react"

interface KakaoAdFitProps {
  desktopAdUnit: string
  desktopWidth: number
  desktopHeight: number
  mobileAdUnit: string
  mobileWidth: number
  mobileHeight: number
}

// 전역 스크립트 로드 상태 관리
let scriptLoaded = false

const KakaoAdFit: React.FC<KakaoAdFitProps> = ({
  desktopAdUnit,
  desktopWidth,
  desktopHeight,
  mobileAdUnit,
  mobileWidth,
  mobileHeight,
}) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [isClient])

  useEffect(() => {
    if (!isClient || scriptLoaded) return

    // Kakao AdFit 스크립트 동적 로드 (한 번만)
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.async = true
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js"
    script.charset = "utf-8"

    script.onload = () => {
      scriptLoaded = true
      console.log("Kakao AdFit script loaded")
    }

    script.onerror = () => {
      console.error("Failed to load Kakao AdFit script")
    }

    document.head.appendChild(script)

    return () => {
      // 스크립트는 제거하지 않음 (다른 컴포넌트에서도 사용할 수 있음)
    }
  }, [isClient])

  if (!isClient) {
    return null // 서버 사이드 렌더링 시에는 아무것도 렌더링하지 않음
  }

  const currentAdUnit = isMobile ? mobileAdUnit : desktopAdUnit
  const currentWidth = isMobile ? mobileWidth : desktopWidth
  const currentHeight = isMobile ? mobileHeight : desktopHeight

  console.log("Rendering ad:", {
    isMobile,
    currentAdUnit,
    currentWidth,
    currentHeight,
  })

  return (
    <ins
      className="kakao_ad_area"
      style={{ display: "none", width: "100%" }}
      data-ad-unit={currentAdUnit}
      data-ad-width={currentWidth}
      data-ad-height={currentHeight}
    />
  )
}

export default KakaoAdFit
