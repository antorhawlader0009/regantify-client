/** @type {import('tailwindcss').Config} */
export default {
  // Only the marketing home uses dark: variants (its day / night switch puts a
  // `dark` class on its root), so it is a class, not the OS setting.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dashboard palette. The values live in index.css as RGB channels
        // (--c-*): indigo by default (the vendor panel, from the
        // regantify-admin theme zip) and red under body.admin-panel (from
        // regantify-admin2), so the two dashboards read as different
        // places. Tailwind needs the channel form to keep /opacity working.
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          dark: 'rgb(var(--c-brand-dark) / <alpha-value>)',
          lime: 'rgb(var(--c-accent) / <alpha-value>)', // the "lime" name stays; it is the soft highlight colour now
          blue: '#1D6BF3',
        },
        line: 'rgb(var(--c-line) / <alpha-value>)',
        // The older token names stay (every page uses them) but now carry
        // the palette above: black and cta are both the primary.
        'regantify-black': 'rgb(var(--c-brand) / <alpha-value>)',
        'regantify-topbar': 'rgb(var(--c-brand-dark) / <alpha-value>)',
        'regantify-sidebar': 'rgb(var(--c-sidebar) / <alpha-value>)',
        'regantify-content': 'rgb(var(--c-content) / <alpha-value>)',
        'regantify-search': 'rgb(var(--c-search) / <alpha-value>)',
        'regantify-text': 'rgb(var(--c-text) / <alpha-value>)',
        'regantify-text-muted': 'rgb(var(--c-muted) / <alpha-value>)',
        'regantify-cta': 'rgb(var(--c-brand) / <alpha-value>)',
        'regantify-cta-dark': 'rgb(var(--c-brand-dark) / <alpha-value>)',
        // LMS has its own light theme; the values live in
        // pages/vendor/lms/lms-theme.css so a redesign swaps them there.
        lms: {
          page: 'var(--lms-page)',
          surface: 'var(--lms-surface)',
          ink: 'var(--lms-ink)',
          muted: 'var(--lms-muted)',
          line: 'var(--lms-line)',
          call: 'var(--lms-call)',
          alert: 'var(--lms-alert)',
          chart: 'var(--lms-chart)',
          'stage-new': 'var(--lms-stage-new)',
          'stage-trying': 'var(--lms-stage-trying)',
          'stage-talks': 'var(--lms-stage-talks)',
          'stage-won': 'var(--lms-stage-won)',
          'stage-lost': 'var(--lms-stage-lost)',
        },
        // POS has its own light theme too; values in pages/vendor/pos/pos-theme.css.
        pos: {
          page: 'var(--pos-page)',
          surface: 'var(--pos-surface)',
          ink: 'var(--pos-ink)',
          muted: 'var(--pos-muted)',
          line: 'var(--pos-line)',
          go: 'var(--pos-go)',
          alert: 'var(--pos-alert)',
          accent: 'var(--pos-accent)',
          'accent-ink': 'var(--pos-accent-ink)',
          bar: 'var(--pos-bar)',
          'bar-ink': 'var(--pos-bar-ink)',
        },
      },
      fontFamily: {
        brand: ['"Irish Grover"', 'cursive'],
        sans: ['Inter', 'sans-serif'],
        // Top bar of the marketing home / login / sign up. Bangla glyphs fall
        // back to Hind Siliguri, which has them.
        nav: ['"Plus Jakarta Sans"', '"Hind Siliguri"', 'sans-serif'],
      },
      borderRadius: {
        frame: '20px',
      },
    },
  },
  plugins: [],
};
