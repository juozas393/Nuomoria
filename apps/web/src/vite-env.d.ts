/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_APP_NAME: string
  // Legacy CRA fallback support
  readonly REACT_APP_SUPABASE_URL?: string
  readonly REACT_APP_SUPABASE_ANON_KEY?: string
  readonly REACT_APP_APP_URL?: string
  readonly REACT_APP_APP_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
