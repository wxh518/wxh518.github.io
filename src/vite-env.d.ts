/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTENT_SOURCE?: 'local' | 'http'
  readonly VITE_CONTENT_API_URL?: string
}
