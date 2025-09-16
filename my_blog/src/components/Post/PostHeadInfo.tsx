import React, { FunctionComponent } from "react"
import styled from "@emotion/styled"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"
import useGTMViewCount from "hooks/useGTMViewCount"
import { navigate } from "gatsby"

export type PostHeadInfoProps = {
  title: string
  date: string
  categories: string[]
  postSlug?: string
}

const PostHeadInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 768px;
  height: 100%;
  margin: 0 auto;
  padding: 60px 0;
  color: #ffffff;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    width: 100%;
    padding: 40px 20px;
  }
`

const PrevPageIcon = styled.div`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #ffffff;
  color: #000000;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    width: 30px;
    height: 30px;
    font-size: 18px;
  }
`

const Title = styled.div`
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: break-word;
  margin-top: auto;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 36px;
  font-weight: 800;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    font-size: 30px;
  }
`

const PostData = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  font-size: 18px;
  font-weight: 700;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    font-size: 15px;
    line-height: 1.5;
  }
`

const CategoryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  position: relative;
  z-index: 10;
`

const Category = styled.div`
  padding: 3px 5px;
  border-radius: 3px;
  background: #7c7c7c;
  font-size: 12px;
  font-weight: 700;
`

const PostHeadInfo: FunctionComponent<PostHeadInfoProps> = function ({
  title,
  date,
  categories,
  postSlug,
}) {
  // GA4 이벤트 전송 (조회수 표시는 하지 않음)
  useGTMViewCount(postSlug || '')

  return (
    <PostHeadInfoWrapper>
   <PrevPageIcon onClick={() => navigate('/')}>
        <FontAwesomeIcon icon={faArrowLeft} />
      </PrevPageIcon>
      <Title>{title}</Title>
      <PostData>
        <div>{date}</div>
      </PostData>
      <CategoryList>
        {categories.map(category => (
          <Category key={category}>{category}</Category>
        ))}
      </CategoryList>
    </PostHeadInfoWrapper>
  )
}

export default PostHeadInfo
