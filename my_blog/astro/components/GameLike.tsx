import useSupabaseLike from '../../src/hooks/useSupabaseLike'
import { supabase } from '../../src/lib/supabaseClient'

type GameLikeProps = {
  slug: string
  name: string
}

export default function GameLike({ slug, name }: GameLikeProps) {
  const { liked, likeCount, loading, error, toggleLike } = useSupabaseLike(`game:${slug}`)
  const enabled = Boolean(supabase)

  return (
    <section className="game-like" aria-label={`${name} 좋아요`}>
      <div>
        <strong>재미있게 플레이하셨나요?</strong>
        <p>좋아요를 남기면 다음 게임을 만드는 데 참고할게요.</p>
      </div>
      <button
        type="button"
        className={'like-button' + (liked ? ' is-liked' : '')}
        onClick={toggleLike}
        disabled={loading || !enabled}
        aria-pressed={liked}
        title={!enabled ? '현재 환경에서는 좋아요 연동이 비활성화되어 있습니다.' : undefined}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
        좋아요 <span>{enabled ? likeCount : '—'}</span>
      </button>
      {error && <p className="form-error" role="alert">좋아요를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
    </section>
  )
}
