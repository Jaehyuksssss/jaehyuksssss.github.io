const infrastructure = ['aws', 'linux', 'jenkins', 'ci/cd', 'kubernetes', 'docker', 'infra', 'cloud']
const frontend = ['next', 'next.js', 'react', 'javascript', 'typescript', 'web', 'webview', 'css', 'html']
export function matchesCategory(tags: string[], category: string) {
  if (category === 'All') return true
  const normalized = tags.map(tag => tag.toLowerCase())
  if (category === 'Infrastructure') return normalized.some(tag => infrastructure.includes(tag))
  if (category === 'Frontend') return normalized.some(tag => frontend.includes(tag))
  return normalized.includes(category.toLowerCase())
}
