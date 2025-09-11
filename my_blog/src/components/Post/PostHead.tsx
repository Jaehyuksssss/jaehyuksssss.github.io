import React, { FunctionComponent } from "react"
import styled from "@emotion/styled"
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image"
import PostHeadInfo from "./PostHeadInfo"

type PostHeadProps = {
  title: string
  date: string
  categories: string[]
  thumbnail: IGatsbyImageData | string
  postSlug?: string
}

const PostHeadWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 400px;

  @media (max-width: 768px) {
    height: 300px;
  }
`

const BackgroundImage = styled((props: any) => (
  <GatsbyImage {...props} style={{ position: 'absolute' }} />
))`
  z-index: -1;
  width: 100%;
  height: 400px;
  object-fit: cover;
  filter: brightness(0.25);

  @media (max-width: 768px) {
    height: 300px;
  }
`

const BackgroundImageString = styled.img`
  position: absolute;
  z-index: -1;
  width: 100%;
  height: 400px;
  object-fit: cover;
  filter: brightness(0.25);

  @media (max-width: 768px) {
    height: 300px;
  }
`

const PostHead: FunctionComponent<PostHeadProps> = function ({
  title,
  date,
  categories,
  thumbnail,
  postSlug,
}) {
  const isThumbnailString = typeof thumbnail === 'string';
  
  // Ensure thumbnail path includes pathPrefix
  const getThumbnailSrc = (thumb: string) => {
    if (thumb && thumb.startsWith('/') && !thumb.startsWith('/blog/')) {
      return `/blog${thumb}`;
    }
    return thumb;
  };
  
  return (
    <PostHeadWrapper>
      {isThumbnailString && thumbnail ? (
        <BackgroundImageString src={getThumbnailSrc(thumbnail)} alt="thumbnail" />
      ) : !isThumbnailString && thumbnail ? (
        <BackgroundImage image={thumbnail} alt="thumbnail" />
      ) : null}
      <PostHeadInfo 
        title={title} 
        date={date} 
        categories={categories} 
        postSlug={postSlug}
      />
    </PostHeadWrapper>
  )
}

export default PostHead
