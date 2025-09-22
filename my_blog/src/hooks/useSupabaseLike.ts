import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type UseLikeOptions = {
  onToggle?: (liked: boolean, count: number) => void
}

export default function useSupabaseLike(
  postSlug: string | undefined,
  options: UseLikeOptions = {}
) {
  const [liked, setLiked] = useState<boolean>(false)
  const [likeCount, setLikeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 사용자 IP 가져오기
  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch {
      return `${navigator.userAgent}-${Date.now()}`
    }
  }

  // 좋아요 상태 확인
  const checkLikeStatus = async () => {
    if (!postSlug || !supabase) return

    try {
      const userIP = await getUserIP()
      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_slug', postSlug)
        .eq('user_ip', userIP)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setLiked(!!data)
    } catch (e: any) {
      console.warn('[Like] Check status error:', e?.message)
    }
  }

  // 좋아요 수 가져오기
  const getLikeCount = async () => {
    if (!postSlug || !supabase) return

    try {
      const { data, error } = await supabase.rpc('get_like_count', {
        p_slug: postSlug
      })
      
      if (error) throw error
      setLikeCount(Number(data) || 0)
    } catch (e: any) {
      console.warn('[Like] Get count error:', e?.message)
    }
  }

  // 좋아요 토글
  const toggleLike = async () => {
    if (!postSlug || !supabase) return

    setLoading(true)
    setError(null)

    try {
      const userIP = await getUserIP()
      const { data, error } = await supabase.rpc('toggle_like', {
        p_slug: postSlug,
        p_user_ip: userIP
      })

      if (error) throw error

      const newCount = Number(data) || 0
      const newLiked = newCount > likeCount

      setLikeCount(newCount)
      setLiked(newLiked)

      options.onToggle?.(newLiked, newCount)
    } catch (e: any) {
      setError(e?.message || 'Failed to toggle like')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!postSlug) return

    const init = async () => {
      setLoading(true)
      await Promise.all([checkLikeStatus(), getLikeCount()])
      setLoading(false)
    }

    init()
  }, [postSlug])

  return {
    liked,
    likeCount,
    loading,
    error,
    toggleLike
  }
}
