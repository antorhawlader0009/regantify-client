/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STOREFRONT_URL: string;
  readonly VITE_PLATFORM_IP: string;
  readonly VITE_ROOT_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
