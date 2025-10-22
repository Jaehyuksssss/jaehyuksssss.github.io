import React, { useEffect, useState } from "react"

interface KakaoAdFitProps {
  desktopAdUnit: string
  desktopWidth: number
  desktopHeight: number
  mobileAdUnit: string
  mobileWidth: number
  mobileHeight: number
}

const KakaoAdFit: React.FC<KakaoAdFitProps> = ({
  desktopAdUnit,
  desktopWidth,
  desktopHeight,
  mobileAdUnit,
  mobileWidth,
  mobileHeight,
}) => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])
  useEffect(() => {
    // Kakao AdFit 스크립트 동적 로드
    const script = document.createElement("script")
    script.type = "text/javascript"
    script.async = true
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js"
    script.charset = "utf-8"

    document.head.appendChild(script)

    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const currentAdUnit = isMobile ? mobileAdUnit : desktopAdUnit
  const currentWidth = isMobile ? mobileWidth : desktopWidth
  const currentHeight = isMobile ? mobileHeight : desktopHeight

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
