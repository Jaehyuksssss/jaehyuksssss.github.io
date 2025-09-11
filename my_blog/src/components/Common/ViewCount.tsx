import React from 'react'
import styled from '@emotion/styled'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'

interface ViewCountProps {
  count: number
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
}

const ViewCountWrapper = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.size === 'small' ? '#666' : '#333'};
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '12px'
      case 'medium': return '14px'
      case 'large': return '16px'
      default: return '14px'
    }
  }};
  font-weight: 500;
`

const Icon = styled(FontAwesomeIcon)`
  color: ${props => props.color || '#666'};
`

const Count = styled.span<{ loading: boolean }>`
  opacity: ${props => props.loading ? 0.5 : 1};
  transition: opacity 0.2s ease;
`

const ViewCount: React.FC<ViewCountProps> = ({ 
  count, 
  loading = false, 
  size = 'medium' 
}) => {
  return (
    <ViewCountWrapper size={size}>
      <Icon icon={faEye} size="sm" />
      <Count loading={loading}>
        {loading ? '...' : count.toLocaleString()}
      </Count>
    </ViewCountWrapper>
  )
}

export default ViewCount
