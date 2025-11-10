import React, { FunctionComponent, useMemo } from "react"
import Introduction from "components/Main/Introduction"
import CategoryList, { CategoryListProps } from "components/Main/CategoryList"
import PostList, { PostType } from "components/Main/PostList"
import GoogleAdSense from "components/Common/GoogleAdSense"
import { graphql } from "gatsby"
import { RecoilRoot } from "recoil"
import { PostListItemType } from "types/PostItem.types"
import { IGatsbyImageData } from "gatsby-plugin-image"
import queryString, { ParsedQuery } from "query-string"
import Template from "components/Common/Template"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"
import styled from "@emotion/styled"

const MobileAdContainer = styled.div`
  display: none;
  padding: 20px;

  @media (max-width: 768px) {
    display: block;

    /* 모바일 광고 크기 제한 */
    .adsbygoogle {
      max-width: 100% !important;
      max-height: 100px !important;
      overflow: hidden !important;
    }

    /* Google AdSense iframe 크기 제한 */
    iframe {
      max-width: 100% !important;
      max-height: 100px !important;
    }
  }
`

type IndexPageProps = {
  location: {
    search: string
  }
  data: {
    site: {
      siteMetadata: {
        title: string
        description: string
        siteUrl: string
      }
    }
    allMarkdownRemark: {
      edges: PostListItemType[]
    }
    file: {
      childImageSharp?: {
        gatsbyImageData: IGatsbyImageData
      }
      publicURL: string
    }
  }
}

const IndexPage: FunctionComponent<IndexPageProps> = function ({
  location: { search },
  data: {
    site: {
      siteMetadata: { title, description, siteUrl },
    },
    allMarkdownRemark: { edges },
    file,
  },
}) {
  const parsed: ParsedQuery<string> = queryString.parse(search)
  const selectedCategory: string =
    typeof parsed.category !== "string" || !parsed.category
      ? "All"
      : parsed.category

  const categoryList = useMemo(
    () =>
      edges.reduce(
        (
          list: CategoryListProps["categoryList"],
          {
            node: {
              frontmatter: { categories },
            },
          }: PostListItemType
        ) => {
          categories.forEach(category => {
            if (list[category] === undefined) list[category] = 1
            else list[category]++
          })

          list["All"]++

          return list
        },
        { All: 0 }
      ),
    [edges]
  )

  const gatsbyImageData = file?.childImageSharp?.gatsbyImageData
  const publicURL = file?.publicURL

  // Count a homepage visit at most once per day (global across site)
  useSupabaseViewCount("__home__", {
    coolDownMinutes: 60 * 24,
    globalCoolDown: true,
  })

  return (
    <RecoilRoot>
      <Template
        title={title}
        description={description}
        url={siteUrl}
        image={publicURL}
      >
        <Introduction profileImage={gatsbyImageData} />
        <CategoryList
          selectedCategory={selectedCategory}
          categoryList={categoryList}
          posts={edges}
        />
        {/* <MobileAdContainer>
          <GoogleAdSense
            adClient="ca-pub-3398641306673607"
            adSlot="2123128311"
            adFormat="auto"
            fullWidthResponsive={true}
          />
        </MobileAdContainer> */}
        <div style={{ height: "20px" }}></div>
        <PostList selectedCategory={selectedCategory} posts={edges} />
      </Template>
    </RecoilRoot>
  )
}

export default IndexPage

export const getPostList = graphql`
  query getPostList {
    site {
      siteMetadata {
        title
        description
        siteUrl
      }
    }
    allMarkdownRemark(
      sort: { order: DESC, fields: [frontmatter___date, frontmatter___title] }
    ) {
      edges {
        node {
          id
          fields {
            slug
          }
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
    file(name: { eq: "profile-image" }) {
      childImageSharp {
        gatsbyImageData(width: 120, height: 120)
      }
      publicURL
    }
  }
`
