export function navigate(to: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return
  if (options?.replace) window.location.replace(to)
  else window.location.assign(to)
}
