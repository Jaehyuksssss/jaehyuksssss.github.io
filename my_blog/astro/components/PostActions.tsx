import useSupabaseLike from '../../src/hooks/useSupabaseLike'
import { supabase } from '../../src/lib/supabaseClient'

export default function PostActions({ slug }: { slug: string }) {
  const { liked, likeCount, loading, error, toggleLike } = useSupabaseLike(slug)
  return <div className="post-actions">
    <div><strong>읽어주셔서 감사합니다.</strong><p>틀린 내용이나 궁금한 점은 댓글로 남겨주세요.</p></div>
    <button type="button" className={'like-button' + (liked ? ' is-liked' : '')}
      onClick={toggleLike} disabled={loading || !supabase} aria-pressed={liked}
      title={!supabase ? '현재 환경에서는 좋아요 연동이 비활성화되어 있습니다.' : undefined}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
      좋아요 <span>{supabase ? likeCount : '—'}</span>
    </button>
    {error && <p className="form-error" role="alert">좋아요를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
  </div>
}
