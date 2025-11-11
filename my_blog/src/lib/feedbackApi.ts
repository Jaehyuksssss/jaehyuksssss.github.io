import { supabase } from './supabaseClient'

export type PublicFeedback = {
  id: string
  display_name: string
  content: string
  created_at: string
}

export async function submitFeedback(params: {
  name: string
  email: string
  content: string
}): Promise<boolean> {
  if (!supabase || typeof window === 'undefined') return false
  const name = params.name.trim()
  const email = params.email.trim()
  const content = params.content.trim()

  if (!/^.{2,20}$/.test(name)) return false
  if (!/^.{1,320}$/.test(email) || !/.+@.+\..+/.test(email)) return false
  if (!(content.length >= 10 && content.length <= 1000)) return false

  const { error } = await supabase.rpc('gf_submit_feedback', {
    p_name: name,
    p_email: email,
    p_content: content,
  })

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Supabase] gf_submit_feedback error', error)
    }
    return false
  }
  return true
}

export async function fetchRecentFeedback(limit = 10): Promise<PublicFeedback[]> {
  if (!supabase || typeof window === 'undefined') return []
  const { data, error } = await supabase.rpc('gf_recent_public', {
    p_limit: limit,
  })
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[Supabase] gf_recent_public error', error)
    }
    return []
  }
  return (data || []) as PublicFeedback[]
}

