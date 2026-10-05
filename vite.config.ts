import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // POS offline shell (POS-system-plan.md Step 13). The service worker is registered by the POS
    // counter page only, with scope /vendor/pos/, so the rest of the dashboard is never served
    // from it. It keeps the built app (index.html + assets) so the counter can reload with no
    // internet; API calls are never cached (offline sales live in IndexedDB, lib/posOffline.ts).
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        // The app only (not the marketing images in public/).
        globPatterns: ['index.html', 'assets/**/*.{js,css,svg,png,woff2}'],
        // The whole app bundle is a few MB; the counter needs all of it to start offline.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/vendor\/pos\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: {
    port: 5173,
    // Bind to all network interfaces (not just localhost) so the dev
    // server is reachable from other machines on the same LAN — e.g. a
    // tester's PC opening http://<your-machine-LAN-IP>:5173.
    // Using the literal '0.0.0.0' here (instead of `true`) so this takes
    // effect even if an old cached CLI arg or env var tries to override it.
    host: '0.0.0.0',
    watch: {
      // Stray .zip files sometimes end up inside public/ (e.g. leftover
      // from how a project was packaged/unpacked) and can crash Vite's
      // file watcher with EBUSY on Windows if something else (antivirus,
      // OneDrive, Explorer) has them open. They're never something the
      // dev server needs to watch, so ignore all zips outright.
      ignored: ['**/*.zip'],
    },
  },
});
