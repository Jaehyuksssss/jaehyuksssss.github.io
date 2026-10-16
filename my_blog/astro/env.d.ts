/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string
  readonly PUBLIC_SUPABASE_ANON_KEY?: string
  readonly PUBLIC_UTTERANCES_REPO?: string
  readonly PUBLIC_GTM_CONTAINER_ID?: string
  readonly PUBLIC_ADSENSE_CLIENT?: string
  readonly PUBLIC_ADSENSE_SLOT?: string
  readonly PUBLIC_ENABLE_LOCAL_SERVICES?: string
  readonly GATSBY_SUPABASE_URL?: string
  readonly GATSBY_SUPABASE_ANON_KEY?: string
  readonly GATSBY_UTTERANCES_REPO?: string
  readonly GATSBY_GTM_CONTAINER_ID?: string
  readonly GATSBY_ADSENSE_CLIENT?: string
  readonly GATSBY_ADSENSE_SLOT?: string
}

interface ImportMeta { readonly env: ImportMetaEnv }
