import { useMemo } from "react"
import type { FunctionComponent } from "react"
import Introduction from "components/Main/Introduction"
import CategoryList from "components/Main/CategoryList"
import type { CategoryListProps } from "components/Main/CategoryList"
import PostList from "components/Main/PostList"
import { graphql } from "lib/legacyGatsby"
import type { PostListItemType } from "types/PostItem.types"
import { type LegacyImageData } from "../types/PostItem.types"
import Template from "components/Common/Template"
import useSupabaseViewCount from "hooks/useSupabaseViewCount"

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
        gatsbyImageData: LegacyImageData
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
  const selectedCategory = new URLSearchParams(search).get("category") || "All"

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
    <>
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

        <div style={{ height: "20px" }}></div>
        <PostList selectedCategory={selectedCategory} posts={edges} />
      </Template>
    </>
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
