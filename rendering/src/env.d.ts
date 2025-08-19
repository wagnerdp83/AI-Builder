/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly MISTRAL_API_KEY: string;
  // Add other env vars here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface HSStaticMethods {
  autoInit: (components: string[]) => void;
}

interface Window {
  HSStaticMethods?: HSStaticMethods;
}
