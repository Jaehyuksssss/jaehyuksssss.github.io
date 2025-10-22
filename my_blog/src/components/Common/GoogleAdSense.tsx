import React, { useEffect, useState, useRef } from "react"

interface GoogleAdSenseProps {
  adClient: string
  adSlot: string
  adFormat?: string
  fullWidthResponsive?: boolean
}

// 전역 스크립트 로드 상태 관리
let scriptLoaded = false
let scriptLoading = false

const GoogleAdSense: React.FC<GoogleAdSenseProps> = ({
  adClient,
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
}) => {
  const [isClient, setIsClient] = useState(false)
  const [scriptReady, setScriptReady] = useState(false)
  const adRef = useRef<HTMLElement>(null)

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || scriptLoaded || scriptLoading) return

    scriptLoading = true

    // Google AdSense 스크립트 동적 로드 (한 번만)
    const script = document.createElement("script")
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`
    script.crossOrigin = "anonymous"

    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      setScriptReady(true)
      console.log("Google AdSense script loaded")
    }

    script.onerror = () => {
      scriptLoading = false
      console.error("Failed to load Google AdSense script")
    }

    document.head.appendChild(script)

    return () => {
      // 스크립트는 제거하지 않음
    }
  }, [isClient, adClient])

  useEffect(() => {
    if (!isClient || !scriptReady || !adRef.current) return

    // DOM이 완전히 렌더링된 후 광고 초기화
    const timer = setTimeout(() => {
      try {
        ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
        ;(window as any).adsbygoogle.push({})
        console.log(`AdSense ad initialized for slot: ${adSlot}`)
      } catch (error) {
        console.error("Failed to initialize AdSense:", error)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [isClient, scriptReady, adSlot])

  if (!isClient) {
    return null // 서버 사이드 렌더링 시에는 아무것도 렌더링하지 않음
  }

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ 
        display: "block",
        minWidth: "160px",
        minHeight: "100px"
      }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  )
}

export default GoogleAdSense
