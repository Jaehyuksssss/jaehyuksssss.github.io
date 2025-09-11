import { useState, useEffect } from 'react'

interface ViewCountData {
  [key: string]: number
}

const STORAGE_KEY = 'blog_view_counts'

export const useViewCount = (postSlug: string) => {
  const [viewCount, setViewCount] = useState<number>(0)

  useEffect(() => {
    // localStorage에서 조회수 데이터 가져오기
    const getViewCounts = (): ViewCountData => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : {}
      } catch {
        return {}
      }
    }

    // 조회수 증가
    const incrementViewCount = () => {
      const viewCounts = getViewCounts()
      const currentCount = viewCounts[postSlug] || 0
      const newCount = currentCount + 1
      
      viewCounts[postSlug] = newCount
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewCounts))
      setViewCount(newCount)
    }

    // 현재 조회수 가져오기
    const viewCounts = getViewCounts()
    const currentCount = viewCounts[postSlug] || 0
    setViewCount(currentCount)

    // 조회수 증가 (페이지 방문 시)
    incrementViewCount()
  }, [postSlug])

  return viewCount
}

export default useViewCount
