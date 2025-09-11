import React from 'react'
import { Helmet } from 'react-helmet'

interface GoogleTagManagerProps {
  containerId: string
}

const GoogleTagManager: React.FC<GoogleTagManagerProps> = ({ containerId }) => {
  return (
    <Helmet>
      {/* GTM Head Script */}
      <script>
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${containerId}');
        `}
      </script>
    </Helmet>
  )
}

// GTM Body Script Component
export const GoogleTagManagerBody: React.FC<GoogleTagManagerProps> = ({ containerId }) => {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${containerId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}

export default GoogleTagManager
