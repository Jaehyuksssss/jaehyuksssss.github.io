const localHost = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

// Previewing a migration must not write to the production database or analytics.
export const externalServicesEnabled =
  (import.meta.env.PROD && !localHost) || import.meta.env.PUBLIC_ENABLE_LOCAL_SERVICES === 'true'
