import React from 'react'
import { Helmet } from 'react-helmet'

interface GoogleAdSenseProps {
  client: string
}

// Injects Google AdSense Auto Ads script into <head>.
// Render this only in production to avoid noisy requests during development.
const GoogleAdSense: React.FC<GoogleAdSenseProps> = ({ client }) => {
  if (!client) return null
  if (process.env.NODE_ENV !== 'production') return null

  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    client,
  )}`

  return (
    <Helmet>
      <script async src={src} crossOrigin="anonymous" />
    </Helmet>
  )
}

export default GoogleAdSense
