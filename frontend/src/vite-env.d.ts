/// <reference types="vite/client" />

// Provides types for `import.meta.env` (VITE_* vars). Without this file every
// `import.meta.env.X` access is a TS2339 error — it was missing from the repo,
// so the errors were pre-existing across firebase.ts, queryClient.ts and others.

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_GOAFFPRO_SHOP_ID?: string;
  readonly VITE_GOAFFPRO_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
