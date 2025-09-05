import React, { FunctionComponent } from 'react'
import styled from '@emotion/styled'
import { GatsbyImage, IGatsbyImageData } from 'gatsby-plugin-image'
import PostHeadInfo, { PostHeadInfoProps } from './PostHeadInfo'

type GatsbyImgProps = {
  image: IGatsbyImageData
  alt: string
  className?: string
}

type PostHeadProps = PostHeadInfoProps & {
  thumbnail: IGatsbyImageData | string
}

const PostHeadWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 400px;

  @media (max-width: 768px) {
    height: 300px;
  }
`

const BackgroundImage = styled((props: GatsbyImgProps) => (
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
}) {
  const isThumbnailString = typeof thumbnail === 'string';
  
  // Ensure thumbnail path includes pathPrefix
  const getThumbnailSrc = (thumb: string) => {
    if (thumb.startsWith('/') && !thumb.startsWith('/blog/')) {
      return `/blog${thumb}`;
    }
    return thumb;
  };
  
  return (
    <PostHeadWrapper>
      {isThumbnailString ? (
        <BackgroundImageString src={getThumbnailSrc(thumbnail)} alt="thumbnail" />
      ) : (
        <BackgroundImage image={thumbnail} alt="thumbnail" />
      )}
      <PostHeadInfo title ={title} date={date} categories={categories} />
    </PostHeadWrapper>
  )
}

export default PostHead
