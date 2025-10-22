import React, { useEffect } from 'react'

interface GoogleAdSlotProps {
  slot: string
  format?: string
  layout?: string
  style?: React.CSSProperties
  responsive?: boolean
}

// Renders a manual AdSense ad unit. Ensure the head script is loaded
// via GoogleAdSense and pass your ad unit slot id from AdSense UI.
const GoogleAdSlot: React.FC<GoogleAdSlotProps> = ({
  slot,
  format = 'auto',
  layout,
  style,
  responsive = true,
}) => {
  const client = process.env.GATSBY_ADSENSE_CLIENT
  if (!client) return null

  useEffect(() => {
    try {
      // @ts-ignore - adsbygoogle is injected by the AdSense script
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (_) {
      // no-op
    }
  }, [slot])

  const dataAttrs: Record<string, string> = {}
  if (layout) dataAttrs['data-ad-layout'] = layout

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...(style || {}) }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
      {...(dataAttrs as any)}
    />
  )
}

export default GoogleAdSlot

