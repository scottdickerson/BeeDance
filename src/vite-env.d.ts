/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAYER_BASE_TIME_SECONDS?: string;
  readonly VITE_PLAYER_SECONDS_PER_EXTRA_STEP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
