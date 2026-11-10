/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the REST API. Defaults to the same-origin `/api`. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
