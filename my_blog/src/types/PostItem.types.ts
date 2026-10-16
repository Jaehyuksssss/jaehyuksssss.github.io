export type LegacyImageData = {
  images?: { fallback?: { src?: string } }
}

export type PostFrontmatterType = {
  title: string
  date: string
  categories: string[]
  summary: string
  thumbnail: {
    childImageSharp?: {
      gatsbyImageData?: LegacyImageData
    }
    publicURL?: string
  } | string
}

export type PostListItemType = {
  node: {
    id: string
    fields: {
      slug: string
    }
    frontmatter: PostFrontmatterType
  }
}
