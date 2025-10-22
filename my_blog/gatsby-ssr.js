/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/ssr-apis/
 */

const React = require("react")

// Inject the Google AdSense account verification meta tag on every page
exports.onRenderBody = ({ setHeadComponents }) => {
  const adsenseClient =
    process.env.GATSBY_ADSENSE_CLIENT || "ca-pub-3398641306673607"
  if (!adsenseClient) return

  setHeadComponents([
    React.createElement("meta", {
      key: "google-adsense-account",
      name: "google-adsense-account",
      content: adsenseClient,
    }),
  ])
}
