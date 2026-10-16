import React from 'react'

interface GoogleAnalyticsProps {
  trackingId: string
}

const GoogleAnalytics: React.FC<GoogleAnalyticsProps> = ({ trackingId }) => {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
      />
      <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${trackingId}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        ` }} />
    </>
  )
}

export default GoogleAnalytics
