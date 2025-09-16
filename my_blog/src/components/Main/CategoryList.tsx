import React, { FunctionComponent, ReactNode, useState, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import { Link } from 'gatsby'

export type CategoryListProps = {
  selectedCategory: string
  categoryList: {
    [key: string]: number
  }
  posts?: Array<{
    node: {
      frontmatter: {
        title: string
        summary: string
        categories: string[]
        date: string
      }
      fields: {
        slug: string
      }
    }
  }>
  hasSearchResults?: boolean // 이 prop 추가
}

type CategoryItemProps = {
  active: boolean;
}

type GatsbyLinkProps = {
  children: ReactNode;
  className?: string;
  to: string;
} & CategoryItemProps

type SearchResult = {
  title: string
  summary: string
  categories: string[]
  slug: string
  date: string
}

const CategoryListWrapper = styled.div<{ isOpen: boolean; hasSearchResults: boolean }>`
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
  overflow: hidden; // 항상 hidden으로 유지
  width: 100%;
  height: ${({ isOpen }) => isOpen ? 'auto' : 'fit-content'}; // 접었을 때는 헤더 높이만
  transition: all 0.2s ease-out;
  opacity: 1;

  @media (max-width: 768px) {
    top: 10px;
    left: 10px;
    right: 10px;
    max-width: calc(100vw - 20px);
  }
`

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;

  @media (max-width: 768px) {
    padding: 12px 16px;
    gap: 8px;
  }
`

const ToggleButton = styled.button<{ isOpen: boolean }>`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  transition: background-color 0.15s ease;
  padding: 8px;
  border-radius: 6px;

  &:hover {
    background: rgba(0, 122, 204, 0.05);
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

const ToggleIcon = styled.div<{ isOpen: boolean }>`
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-out;
  transform: ${({ isOpen }) => isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};

  &::before {
    content: '▼';
    font-size: 10px;
    color: #666;
  }
`

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e1e5e9;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
  background: white;

  &:focus {
    border-color: #007acc;
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
    font-size: 13px;
  }

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 10px;
  }
`

const SearchResults = styled.div<{ isVisible: boolean }>`
  position: fixed; // absolute에서 fixed로 변경
  top: 80px; // CategoryListWrapper 아래 위치
  left: 20px;
  right: 20px;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1002; // CategoryListWrapper(1000)보다 높게
  opacity: ${({ isVisible }) => (isVisible ? '1' : '0')};
  visibility: ${({ isVisible }) => (isVisible ? 'visible' : 'hidden')};
  transform: ${({ isVisible }) => (isVisible ? 'translateY(0)' : 'translateY(-10px)')};
  transition: all 0.2s ease-out;
  margin-top: 4px;

  @media (max-width: 768px) {
    left: 10px;
    right: 10px;
    top: 70px;
  }

  // 커스텀 스크롤바
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`

const SearchResultItem = styled(Link)`
  display: block;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }
`

const ResultTitle = styled.div`
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 3px;
  color: #1f2937;
`

const ResultSummary = styled.div`
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const ResultMeta = styled.div`
  display: flex;
  gap: 6px;
  font-size: 10px;
  color: #9ca3af;
`

const CategoryTag = styled.span`
  background: #e5e7eb;
  color: #374151;
  padding: 1px 4px;
  border-radius: 3px;
`

const NoResults = styled.div`
  padding: 15px;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
`

const CategoryContainer = styled.div<{ isOpen: boolean }>`
  opacity: ${({ isOpen }) => isOpen ? '1' : '0'};
  transform: ${({ isOpen }) => isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease-out;
  padding: ${({ isOpen }) => isOpen ? '0 20px 15px 20px' : '0'};
  pointer-events: ${({ isOpen }) => isOpen ? 'auto' : 'none'};
  max-height: ${({ isOpen }) => isOpen ? 'none' : '0'}; // 접었을 때 높이 0
  overflow: hidden; // 접었을 때 내용 숨김

  @media (max-width: 768px) {
    padding: ${({ isOpen }) => isOpen ? '0 16px 12px 16px' : '0'};
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
  posts = [],
  hasSearchResults = false, // 기본값 false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchPosts = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results = posts
      .map(({ node }) => ({
        title: node.frontmatter.title,
        summary: node.frontmatter.summary,
        categories: node.frontmatter.categories,
        slug: node.fields.slug,
        date: node.frontmatter.date,
      }))
      .filter(post => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.summary.toLowerCase().includes(query.toLowerCase()) ||
        post.categories.some(cat => 
          cat.toLowerCase().includes(query.toLowerCase())
        )
      )
      .slice(0, 4) // 최대 4개 결과만 표시

    setSearchResults(results)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPosts(searchQuery)
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchVisible(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsSearchVisible(true)
  }

  const handleSearchFocus = () => {
    if (searchQuery && searchResults.length > 0) {
      setIsSearchVisible(true)
    }
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <CategoryListWrapper isOpen={isOpen} hasSearchResults={hasSearchResults}>
        <HeaderSection>
          <ToggleButton onClick={toggleMenu} isOpen={isOpen}>
            <span>카테고리</span>
            <ToggleIcon isOpen={isOpen} />
          </ToggleButton>
          
          <SearchContainer ref={searchRef}>
            <SearchInput
              ref={inputRef}
              type="text"
              placeholder="포스트 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
            />
          </SearchContainer>
        </HeaderSection>
        
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

      {/* SearchResults를 CategoryListWrapper 밖으로 이동 */}
      <SearchResults isVisible={isSearchVisible && searchQuery.length > 0}>
        {searchResults.length > 0 ? (
          searchResults.map((result, index) => (
            <SearchResultItem key={index} to={result.slug}>
              <ResultTitle>{result.title}</ResultTitle>
              <ResultSummary>{result.summary}</ResultSummary>
              <ResultMeta>
                <span>{result.date}</span>
                {result.categories.map((category, catIndex) => (
                  <CategoryTag key={catIndex}>#{category}</CategoryTag>
                ))}
              </ResultMeta>
            </SearchResultItem>
          ))
        ) : searchQuery.length > 0 ? (
          <NoResults>검색 결과가 없습니다.</NoResults>
        ) : null}
      </SearchResults>
    </>
  )
}

export default CategoryList