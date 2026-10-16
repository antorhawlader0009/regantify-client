import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run build:analyze` (PERFORMANCE-PLAN.md Step 1): writes bundle-stats.html (what each file is made of, raw and
    // gzipped). Outside dist/, so it is never deployed.
    mode === 'analyze' && visualizer({ filename: 'bundle-stats.html', gzipSize: true, brotliSize: true, template: 'treemap' }),
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
  // PERFORMANCE-PLAN.md Step 7: the big libraries get files of their own, so a page that needs one downloads it once and
  // a new build that doesn't change the library keeps it cached. They are only pulled in by pages that are loaded on
  // first open (App.tsx), so none of them is in the first download.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Rollup moves a manual chunk's own dependencies into it unless they have a chunk of their own, which once put
          // React (and the CommonJS helper) inside the editor file and made the first page download it. Naming them
          // here keeps them in a small shared file instead.
          if (id.includes('commonjsHelpers')) return 'lib-react';
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(id)) return 'lib-react';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'lib-editor';
          if (id.includes('monaco')) return 'lib-code-editor';
          if (id.includes('/xlsx/')) return 'lib-xlsx';
          if (id.includes('@dnd-kit')) return 'lib-dnd';
          if (id.includes('/qrcode/') || id.includes('/jsbarcode/')) return 'lib-codes';
          if (id.includes('barcode-detector') || id.includes('zxing')) return 'lib-scanner';
          return undefined;
        },
      },
    },
  },
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
}));
