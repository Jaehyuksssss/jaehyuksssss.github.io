import React, { FunctionComponent } from "react"
import { graphql } from "gatsby"
import Template from "components/Common/Template"
import PostHead from "components/Post/PostHead"
import PostContent from "components/Post/PostContent"
import CommentWidget from "components/Post/CommentWidget"

export type PostPageItemType = {
  node: {
    html: string
    frontmatter: {
      title: string
      summary: string
      date: string
      categories: string[]
      thumbnail: any
    }
  }
}

type PostTemplateProps = {
  data: {
    allMarkdownRemark: {
      edges: PostPageItemType[]
    }
  }
  location: {
    href: string
  }
}

const PostTemplate: FunctionComponent<PostTemplateProps> = function ({
  data: {
    allMarkdownRemark: { edges },
  },
  location: { href }
}) {
  const {
    node: {
      html,
      frontmatter: {
        title,
        summary,
        date,
        categories,
        thumbnail,
      },
    },
  } = edges[0]

  // thumbnail이 문자열인 경우 처리
  const isThumbnailString = typeof thumbnail === 'string';
  const gatsbyImageData = !isThumbnailString ? thumbnail?.childImageSharp?.gatsbyImageData : null;
  const publicURL = !isThumbnailString ? thumbnail?.publicURL : thumbnail;

  // postSlug 추출 (href에서) - 안전하게 처리
  const postSlug = href ? href.split('/').pop() || '' : ''

  return (
    <Template title={title} description={summary} url={href} image={publicURL}>
      <PostHead
        title={title}
        date={date}
        categories={categories}
        thumbnail={gatsbyImageData || (isThumbnailString ? thumbnail : '')}
        postSlug={postSlug}
      />
      <PostContent html={html} />
      <CommentWidget />
    </Template>
  )
}

export default PostTemplate

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            summary
            date(formatString: "YYYY.MM.DD.")
            categories
            thumbnail
          }
        }
      }
    }
  }
`
