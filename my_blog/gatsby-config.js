require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })

const SITE_URL = "https://jaehyuksssss.github.io"

module.exports = {
  siteMetadata: {
    title: `재혁의 개발 블로그`,
    description: `개발자 임재혁 입니다.`,
    author: `Jaehyuksssss`,
    siteUrl: SITE_URL,
  },
  plugins: [
    {
      resolve: "gatsby-plugin-sitemap",
      options: {
        output: "/",
        resolveSiteUrl: () => SITE_URL,
      },
    },
    {
      resolve: "gatsby-plugin-canonical-urls",
      options: {
        siteUrl: SITE_URL,
        stripQueryString: true,
      },
    },
    {
      resolve: "gatsby-plugin-typescript",
      options: {
        isTSX: true,
        allExtensions: true,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `contents`,
        path: `${__dirname}/contents`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/static`,
      },
    },
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          formats: ["auto", "webp"],
          quality: 100,
          placeholder: "blurred",
        },
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-image`,
    `gatsby-plugin-emotion`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: "gatsby-remark-smartypants",
            options: {
              dashes: "oldschool",
            },
          },
          {
            resolve: "gatsby-remark-prismjs",
            options: {
              classPrefix: "language-",
            },
          },
          {
            resolve: "gatsby-remark-images",
            options: {
              maxWidth: 768,
              quality: 100,
              withWebp: true,
            },
          },
          {
            resolve: "gatsby-remark-copy-linked-files",
            options: {},
          },
          {
            resolve: "gatsby-remark-external-links",
            options: {
              target: "_blank",
              rel: "nofollow",
            },
          },
        ],
      },
    },
  ],
}
