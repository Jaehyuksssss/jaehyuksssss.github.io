import React from 'react'
import styled from '@emotion/styled'

interface ViewCountProps {
  count: number
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
}

const ViewCountWrapper = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ffffff;
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '12px'
      case 'medium': return '14px'
      case 'large': return '16px'
      default: return '14px'
    }
  }};
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
`

const Icon = styled.svg`
  width: 1em;
  height: 1em;
  fill: currentColor;
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
`

const Count = styled.span<{ loading: boolean }>`
  opacity: ${props => props.loading ? 0.7 : 1};
  transition: opacity 0.2s ease;
  font-weight: 700;
`

const ViewCount: React.FC<ViewCountProps> = ({ 
  count, 
  loading = false, 
  size = 'medium' 
}) => {
  return (
    <ViewCountWrapper size={size}>
      <Icon viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5c-5.5 0-9.5 5.2-9.7 5.4a2.5 2.5 0 0 0 0 3.2C2.5 13.8 6.5 19 12 19s9.5-5.2 9.7-5.4a2.5 2.5 0 0 0 0-3.2C21.5 10.2 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </Icon>
      <Count loading={loading}>
        {loading ? '...' : count.toLocaleString()}
      </Count>
    </ViewCountWrapper>
  )
}

export default ViewCount
