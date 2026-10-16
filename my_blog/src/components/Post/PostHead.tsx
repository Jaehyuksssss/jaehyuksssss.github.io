import { type FunctionComponent } from "react"
import styled from "@emotion/styled"
import { type LegacyImageData } from "../../types/PostItem.types"
import PostHeadInfo from "./PostHeadInfo"

type PostHeadProps = {
  title: string
  date: string
  categories: string[]
  thumbnail: LegacyImageData | string
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
  // Drop legacy /blog prefix that was used when the site lived under a subdirectory
  const getThumbnailSrc = (thumb: string) => {
    if (thumb?.startsWith('/blog/')) {
      return thumb.replace(/^\/blog/, '') || '/';
    }
    return thumb;
  };
  const thumbnailSrc = typeof thumbnail === 'string'
    ? getThumbnailSrc(thumbnail)
    : thumbnail.images?.fallback?.src

  return (
    <PostHeadWrapper>
      {thumbnailSrc && <BackgroundImageString src={thumbnailSrc} alt="" />}
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
