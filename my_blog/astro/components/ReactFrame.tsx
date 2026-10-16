import type { ReactNode } from 'react'

// The Astro layout owns navigation, metadata, and page chrome.
// Existing React game pages retain their gameplay, scores, and hooks.
type Props = { children: ReactNode; title?: string; description?: string; url?: string; image?: string; hideGameButton?: boolean; keywords?: string[]; structuredData?: unknown[] }
export default function ReactFrame({ children }: Props) {
  return <div className="react-page">{children}</div>
}
