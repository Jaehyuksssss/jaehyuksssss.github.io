import React from 'react'
import styled from 'styled-components'
import useSupabaseLike from '../../hooks/useSupabaseLike'

const LikeContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  width: 100%;
`

const LikeButton = styled.button<{ liked: boolean; loading: boolean }>`
  background: ${props => props.liked ? '#ff4757' : '#f8f9fa'};
  border: 1px solid ${props => props.liked ? '#ff4757' : '#e9ecef'};
  border-radius: 6px;
  padding: 8px 12px;
  cursor: ${props => props.loading ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.liked ? 'white' : '#495057'};
  min-width: 60px;
  justify-content: center;

  &:hover:not(:disabled) {
    background: #ff4757;
    border-color: #ff4757;
    color: white;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LikeCount = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: inherit;
`

type LikeButtonProps = {
  postSlug: string
}

const LikeButtonComponent: React.FC<LikeButtonProps> = ({ postSlug }) => {
  const { liked, likeCount, loading, error, toggleLike } = useSupabaseLike(postSlug)

  return (
    <LikeContainer>
      <LikeButton
        liked={liked}
        loading={loading}
        onClick={toggleLike}
        disabled={loading}
        aria-label={liked ? '좋아요 취소' : '좋아요'}
      >
        {liked ? '❤️' : '🤍'}
        <LikeCount>{likeCount}</LikeCount>
      </LikeButton>
      
      {error && (
        <div style={{ 
          color: '#ff4757', 
          fontSize: '12px', 
          marginLeft: '12px'
        }}>
          {error}
        </div>
      )}
    </LikeContainer>
  )
}

export default LikeButtonComponent
