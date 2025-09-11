import { useEffect } from 'react'

// GTM을 통한 조회수 추적 (GA4에서만 관리)
export const useGTMViewCount = (postSlug: string) => {
  useEffect(() => {
    // GTM dataLayer에 페이지 뷰 이벤트 전송
    if (typeof window !== 'undefined' && window.dataLayer) {
      const pageUrl = window.location.pathname
      
      window.dataLayer.push({
        event: 'page_view',
        page_title: document.title,
        page_location: window.location.href,
        page_path: pageUrl,
        post_slug: postSlug,
      })
    }
  }, [postSlug])

  // 조회수는 GA4에서만 관리하므로 UI에서는 표시하지 않음
  return { viewCount: 0, loading: false }
}

// dataLayer 타입 선언
declare global {
  interface Window {
    dataLayer: any[]
  }
}

export default useGTMViewCount
