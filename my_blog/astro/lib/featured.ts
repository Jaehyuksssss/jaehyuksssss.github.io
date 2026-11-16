export interface FeaturedPost {
  id: string
  date: number
}

export function selectFeatured<T extends FeaturedPost>(
  posts: T[],
  likes: ReadonlyMap<string, number> = new Map(),
): T[] {
  const ordered = [...posts].sort((a, b) => b.date - a.date || a.id.localeCompare(b.id))
  const latest = ordered[0]
  if (!latest) return []
  const remaining = ordered.slice(1).sort((a, b) =>
    (likes.get('/' + b.id + '/') || 0) - (likes.get('/' + a.id + '/') || 0)
    || b.date - a.date || a.id.localeCompare(b.id),
  )
  return remaining[0] ? [latest, remaining[0]] : [latest]
}

export function selectFeaturedGame<T extends { slug: string }>(
  games: T[],
  likes: ReadonlyMap<string, number> = new Map(),
): T | undefined {
  return [...games].sort((a, b) => (likes.get('game:' + b.slug) || 0) - (likes.get('game:' + a.slug) || 0))[0]
}
