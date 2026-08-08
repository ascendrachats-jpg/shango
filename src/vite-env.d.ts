/// <reference types="vite/client" />

// Static asset module declarations — Vite handles these at build time, but
// TypeScript needs ambient declarations so `import url from "./asset.mp4"`
// type-checks under `noEmit`.
declare module "*.mp4" {
  const src: string
  export default src
}

declare module "*.webm" {
  const src: string
  export default src
}

declare module "*.mov" {
  const src: string
  export default src
}

declare module "*.ogg" {
  const src: string
  export default src
}

// ImportMeta.env shim for `import.meta.env.VITE_*` access in server-side
// generation modules that are type-checked together with the client.
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_NEON_DATABASE_URL?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
