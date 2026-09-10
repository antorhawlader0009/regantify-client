import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
