import type { ReactNode } from 'react'

type TemplateProps = {
  title?: string
  description?: string
  url?: string
  image?: string
  keywords?: string[]
  structuredData?: Array<Record<string, unknown>>
  hideGameButton?: boolean
  children: ReactNode
}

/**
 * Compatibility wrapper for React pages carried over from Gatsby.
 * Astro's SiteLayout owns the document head, navigation, footer, analytics,
 * ads and page metadata, so this component only renders page content.
 */
export default function Template({ children }: TemplateProps) {
  return <div className="react-page">{children}</div>
}
