import { useState, useEffect } from 'react'

interface GA4ViewCountData {
  [key: string]: number
}

// GA4 Reporting API를 사용하여 조회수 가져오기
export const useGA4ViewCount = (postSlug: string) => {
  const [viewCount, setViewCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // 실제 구현에서는 GA4 Reporting API를 사용해야 하지만,
    // 여기서는 gtag 이벤트를 기반으로 한 간단한 구현을 제공합니다.
    
    const getViewCount = () => {
      // gtag 이벤트가 발생했는지 확인
      if (typeof window !== 'undefined' && window.gtag) {
        // 페이지 뷰 이벤트 전송
        window.gtag('event', 'page_view', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: postSlug,
        })
      }
      
      // 실제 조회수는 GA4 대시보드에서 확인해야 합니다.
      // 여기서는 임시로 localStorage를 사용하여 시뮬레이션합니다.
      const stored = localStorage.getItem('ga4_view_counts')
      const viewCounts: GA4ViewCountData = stored ? JSON.parse(stored) : {}
      const currentCount = viewCounts[postSlug] || 0
      
      // 조회수 증가
      const newCount = currentCount + 1
      viewCounts[postSlug] = newCount
      localStorage.setItem('ga4_view_counts', JSON.stringify(viewCounts))
      
      setViewCount(newCount)
      setLoading(false)
    }

    getViewCount()
  }, [postSlug])

  return { viewCount, loading }
}

// gtag 타입 선언
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export default useGA4ViewCount
