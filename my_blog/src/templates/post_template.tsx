import React, { FunctionComponent } from "react"
import { graphql } from "gatsby"
import Template from "components/Common/Template"
import PostHead from "components/Post/PostHead"
import PostContent from "components/Post/PostContent"
import CommentWidget from "components/Post/CommentWidget"
import LikeButton from "components/Post/LikeButton"

export type PostPageItemType = {
  node: {
    html: string
    frontmatter: {
      title: string
      summary: string
      date: string
      dateISO?: string
      categories: string[]
      thumbnail: any
    }
    fields: {
      slug: string
    }
  }
}

type PostTemplateProps = {
  data: {
    site?: {
      siteMetadata?: {
        siteUrl?: string
        title?: string
        author?: string
      }
    }
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
    site,
    allMarkdownRemark: { edges },
  },
  location: { href }
}) {
  const siteMetadata = site?.siteMetadata || {}
  const { siteUrl = "", title: siteTitle = "", author = "" } = siteMetadata

  const normalizedBaseUrl = siteUrl ? siteUrl.replace(/\/$/, "") : ""
  const toAbsoluteUrl = (value?: string) => {
    if (!value) return normalizedBaseUrl
    if (value.startsWith("http")) return value
    if (!normalizedBaseUrl) return value

    const baseForUrl = normalizedBaseUrl.endsWith("/")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/`

    try {
      const relative = value.startsWith("/") ? value : `./${value}`
      return new URL(relative, baseForUrl).toString()
    } catch (error) {
      const sanitizedFallback = value.startsWith("/") ? value : `/${value}`
      return `${normalizedBaseUrl}${sanitizedFallback}`
    }
  }

  const {
    node: {
      html,
      frontmatter: {
        title,
        summary,
        date,
        dateISO,
        categories,
        thumbnail,
      },
      // bring in GraphQL slug field for reliable keying
      fields,
    },
  } = edges[0]

  // thumbnail이 문자열인 경우 처리
  const isThumbnailString = typeof thumbnail === 'string';
  const gatsbyImageData = !isThumbnailString ? thumbnail?.childImageSharp?.gatsbyImageData : null;
  const publicURL = !isThumbnailString ? thumbnail?.publicURL : thumbnail;

  // postSlug는 GraphQL의 fields.slug를 사용해 안정적으로 키를 생성
  const postSlug = fields?.slug || ''

  const canonicalUrl = href || toAbsoluteUrl(postSlug)
  const shareImage = typeof publicURL === 'string' && publicURL.length > 0 ? toAbsoluteUrl(publicURL) : undefined
  const publishedAt = dateISO ? new Date(dateISO).toISOString() : undefined

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: summary,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      datePublished: publishedAt,
      dateModified: publishedAt,
      ...(author
        ? {
            author: {
              "@type": "Person",
              name: author,
            },
          }
        : {}),
      ...(shareImage
        ? {
            image: [shareImage],
          }
        : {}),
      publisher: {
        "@type": "Organization",
        name: siteTitle || title,
      },
      keywords: categories?.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: siteTitle || 'Home',
          item: normalizedBaseUrl || canonicalUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
  ]

  return (
    <Template
      title={title}
      description={summary}
      url={canonicalUrl}
      image={publicURL}
      keywords={categories}
      structuredData={structuredData}
      hideGameButton
    >
      <PostHead
        title={title}
        date={date}
        categories={categories}
        thumbnail={gatsbyImageData || (isThumbnailString ? thumbnail : '')}
        postSlug={postSlug}
      />
      <PostContent html={html} />
      <LikeButton postSlug={postSlug} />
      <CommentWidget />
    </Template>
  )
}

export default PostTemplate

export const queryMarkdownDataBySlug = graphql`
  query queryMarkdownDataBySlug($slug: String) {
    site {
      siteMetadata {
        siteUrl
        title
        author
      }
    }
    allMarkdownRemark(filter: { fields: { slug: { eq: $slug } } }) {
      edges {
        node {
          html
          frontmatter {
            title
            summary
            date(formatString: "YYYY.MM.DD.")
            dateISO: date
            categories
            thumbnail
          }
          fields { slug }
        }
      }
    }
  }
`
