import React, { useEffect } from "react"

interface KakaoAdFitProps {
  adUnit: string
  width: number
  height: number
}

const KakaoAdFit: React.FC<KakaoAdFitProps> = ({ adUnit, width, height }) => {
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

  return (
    <ins
      className="kakao_ad_area"
      style={{ display: "none", width: "100%" }}
      data-ad-unit={adUnit}
      data-ad-width={width}
      data-ad-height={height}
    />
  )
}

export default KakaoAdFit
