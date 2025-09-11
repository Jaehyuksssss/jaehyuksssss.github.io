import { useState, useEffect } from 'react'

interface GTMViewCountData {
  [key: string]: number
}

// GTM을 통한 조회수 추적
export const useGTMViewCount = (postSlug: string) => {
  const [viewCount, setViewCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const getViewCount = () => {
      // GTM dataLayer에 페이지 뷰 이벤트 전송
      if (typeof window !== 'undefined' && window.dataLayer) {
        window.dataLayer.push({
          event: 'page_view',
          page_title: document.title,
          page_location: window.location.href,
          page_path: postSlug,
        })
      }
      
      // 실제 조회수는 GTM에서 GA4로 전송되어 Google Analytics에서 확인
      // 여기서는 임시로 localStorage를 사용하여 시뮬레이션
      const stored = localStorage.getItem('gtm_view_counts')
      const viewCounts: GTMViewCountData = stored ? JSON.parse(stored) : {}
      const currentCount = viewCounts[postSlug] || 0
      
      // 조회수 증가
      const newCount = currentCount + 1
      viewCounts[postSlug] = newCount
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
