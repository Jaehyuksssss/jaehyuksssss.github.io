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
  const adRef = useRef<HTMLModElement>(null)

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    if (scriptLoaded) {
      setScriptReady(true)
      return
    }

    if (scriptLoading) return

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

    let initialized = false
    let resizeObserver: ResizeObserver | null = null
    let intersectionObserver: IntersectionObserver | null = null
    let retryTimer: number | null = null
    let retryCount = 0
    const maxRetries = 12

    const clearRetryTimer = () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }
    }

    const enqueueRetry = () => {
      if (initialized || retryTimer || retryCount >= maxRetries) return
      retryTimer = window.setTimeout(() => {
        retryTimer = null
        retryCount += 1
        initializeAd()
      }, 500)
    }

    const initializeAd = () => {
      if (initialized || !adRef.current) return

      try {
        const element = adRef.current
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        const hasSize = rect.width > 0 && rect.height > 0
        const isDisplayed =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          parseFloat(style.opacity || "1") > 0

        if (!hasSize || !isDisplayed) {
          enqueueRetry()
          return
        }

        ;(window as any).adsbygoogle = (window as any).adsbygoogle || []
        ;(window as any).adsbygoogle.push({})
        initialized = true
        clearRetryTimer()
        console.log(`AdSense ad initialized for slot: ${adSlot}`)
      } catch (error) {
        console.error("Failed to initialize AdSense:", error)
      }
    }

    const immediateTimer = window.setTimeout(initializeAd, 100)

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        initializeAd()
      })
      resizeObserver.observe(adRef.current)
    }

    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
        entries => {
          const anyVisible = entries.some(entry => entry.isIntersecting)
          if (anyVisible) {
            initializeAd()
          }
        },
        { threshold: 0.1 }
      )
      intersectionObserver.observe(adRef.current)
    }

    return () => {
      window.clearTimeout(immediateTimer)
      clearRetryTimer()
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }
    }
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
        width: "100%",
      }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  )
}

export default GoogleAdSense
