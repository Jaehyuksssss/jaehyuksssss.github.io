import React, { FunctionComponent, ReactNode, useState } from 'react'
import styled from '@emotion/styled'
import { Link } from 'gatsby'

export type CategoryListProps = {
  selectedCategory: string
  categoryList: {
    [key: string]: number
  }
}

type CategoryItemProps = {
  active: boolean;
}

type GatsbyLinkProps = {
  children: ReactNode;
  className?: string;
  to: string;
} & CategoryItemProps

const CategoryListWrapper = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: calc(100vw - 40px);
  overflow: hidden;
  height: ${({ isOpen }) => isOpen ? 'auto' : '5%'};
  @media (max-width: 768px) {
    top: 10px;
    left: 10px;
    right: 10px;
    max-width: calc(100vw - 20px);
  }
`

const ToggleButton = styled.button<{ isOpen: boolean }>`
  width: 100%;
  padding: 15px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  transition: background-color 0.15s ease;

  &:hover {
    background: rgba(0, 122, 204, 0.05);
  }

  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 14px;
  }
`

const ToggleIcon = styled.div<{ isOpen: boolean }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-out;
  transform: ${({ isOpen }) => isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};

  &::before {
    content: '▼';
    font-size: 12px;
    color: #666;
  }
`

const CategoryContainer = styled.div<{ isOpen: boolean }>`
  opacity: ${({ isOpen }) => isOpen ? '1' : '0'};
  transform: ${({ isOpen }) => isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease-out;
  padding: ${({ isOpen }) => isOpen ? '0 20px 15px 20px' : '0 20px 0 20px'};
  pointer-events: ${({ isOpen }) => isOpen ? 'auto' : 'none'};

  @media (max-width: 768px) {
    padding: ${({ isOpen }) => isOpen ? '0 16px 12px 16px' : '0 16px 0 16px'};
  }
`

const CategoryItemsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 10px;
`

const CategoryItem = styled(({ active, ...props }: GatsbyLinkProps) => (
  <Link {...props} />
))<CategoryItemProps>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: ${({ active }) => (active ? '700' : '500')};
  cursor: pointer;
  border-radius: 20px;
  background: ${({ active }) => active ? '#007acc' : 'transparent'};
  color: ${({ active }) => active ? 'white' : '#666'};
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-block;
  border: 1px solid ${({ active }) => active ? '#007acc' : 'rgba(0, 0, 0, 0.1)'};

  &:hover {
    background: ${({ active }) => active ? '#005a9e' : 'rgba(0, 122, 204, 0.1)'};
    color: ${({ active }) => active ? 'white' : '#007acc'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 122, 204, 0.2);
  }

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 12px;
  }
`

const CategoryList: FunctionComponent<CategoryListProps> = function ({
  selectedCategory,
  categoryList,
}) {
  const [isOpen, setIsOpen] = useState(false)
  console.log(isOpen)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <CategoryListWrapper isOpen={isOpen}>
      <ToggleButton onClick={toggleMenu} isOpen={isOpen}>
        <span>카테고리</span>
        <ToggleIcon isOpen={isOpen} />
      </ToggleButton>
      
      <CategoryContainer isOpen={isOpen}>
        <CategoryItemsWrapper>
          {Object.entries(categoryList).map(([name, count]) => (
            <CategoryItem
              to={`/?category=${name}`}
              active={name === selectedCategory}
              key={name}
            >
              #{name}({count})
            </CategoryItem>
          ))}
        </CategoryItemsWrapper>
      </CategoryContainer>
    </CategoryListWrapper>
  )
}

export default CategoryList