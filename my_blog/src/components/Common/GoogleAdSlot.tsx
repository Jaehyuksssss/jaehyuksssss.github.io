import { type CSSProperties, type FC, useEffect } from 'react'

interface GoogleAdSlotProps {
  slot: string
  format?: string
  layout?: string
  style?: CSSProperties
  responsive?: boolean
}

// Renders a manual AdSense ad unit. Ensure the head script is loaded
// via GoogleAdSense and pass your ad unit slot id from AdSense UI.
const GoogleAdSlot: FC<GoogleAdSlotProps> = ({
  slot,
  format = 'auto',
  layout,
  style,
  responsive = true,
}) => {
  const client = import.meta.env.PUBLIC_ADSENSE_CLIENT || import.meta.env.GATSBY_ADSENSE_CLIENT

  useEffect(() => {
    if (!client) return
    try {
      const adsWindow = window as typeof window & { adsbygoogle?: Record<string, unknown>[] }
      ;(adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({})
    } catch (_) {
      // no-op
    }
  }, [client, slot])

  if (!client) return null

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...(style || {}) }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  )
}

export default GoogleAdSlot
