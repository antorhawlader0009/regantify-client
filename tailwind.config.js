/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dashboard palette, from the final theme (regantify-new-theme/):
        // dark green primary, lime for the active nav item and highlights,
        // blue for a secondary action, #ececec hairlines on white.
        brand: {
          DEFAULT: '#1F4A44',
          dark: '#173A35',
          lime: '#D9EE94',
          blue: '#1D6BF3',
        },
        line: '#ECECEC',
        // The older token names stay (every page uses them) but now carry
        // the palette above: black and cta are both the green primary.
        'regantify-black': '#1F4A44',
        'regantify-topbar': '#1F4A44',
        'regantify-sidebar': '#FFFFFF',
        'regantify-content': '#F5F5F5',
        'regantify-search': '#F5F5F5',
        'regantify-text': '#1A1A1A',
        'regantify-text-muted': '#737373',
        'regantify-cta': '#1F4A44',
        'regantify-cta-dark': '#173A35',
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
        },
      },
      fontFamily: {
        brand: ['"Irish Grover"', 'cursive'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        frame: '20px',
      },
    },
  },
  plugins: [],
};
