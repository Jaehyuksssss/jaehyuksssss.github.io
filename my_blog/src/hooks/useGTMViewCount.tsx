import { useState, useEffect } from 'react'

interface GTMViewCountData {
  [key: string]: number
}

// GTM을 통한 조회수 추적 (각 게시물별)
export const useGTMViewCount = (postSlug: string) => {
  const [viewCount, setViewCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const getViewCount = () => {
      // 실제 페이지 URL을 기준으로 조회수 관리
      const pageUrl = typeof window !== 'undefined' ? window.location.pathname : postSlug
      
      // GTM dataLayer에 페이지 뷰 이벤트 전송
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'page_view',
          page_title: document.title,
          page_location: window.location.href,
          page_path: pageUrl,
        })
      }
      
      // 각 게시물별 조회수 저장 (페이지 URL 기준)
      const stored = localStorage.getItem('gtm_view_counts')
      const viewCounts: GTMViewCountData = stored ? JSON.parse(stored) : {}
      const currentCount = viewCounts[pageUrl] || 0
      
      // 조회수 증가
      const newCount = currentCount + 1
      viewCounts[pageUrl] = newCount
      localStorage.setItem('gtm_view_counts', JSON.stringify(viewCounts))
      
      setViewCount(newCount)
      setLoading(false)
    }

    getViewCount()
  }, [postSlug])

  return { viewCount, loading }
}

// dataLayer 타입 선언
declare global {
  interface Window {
    dataLayer: any[]
  }
}

export default useGTMViewCount
