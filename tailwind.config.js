/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pulled directly from the Regantify Figma reference
        'regantify-black': '#0E0D0D',
        'regantify-topbar': '#000000',
        'regantify-sidebar': '#EBEBEB',
        'regantify-content': '#F1F1F1',
        'regantify-search': '#FFEFEF',
        'regantify-text': '#302A2A',
        'regantify-text-muted': '#6B5A5A',
        // Reserved for primary CTAs on the marketing/landing page only —
        // everywhere else in the app stays black-on-off-white.
        'regantify-cta': '#E4572E',
        'regantify-cta-dark': '#C73F1B',
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
          'stage-new': 'var(--lms-stage-new)',
          'stage-trying': 'var(--lms-stage-trying)',
          'stage-talks': 'var(--lms-stage-talks)',
          'stage-won': 'var(--lms-stage-won)',
          'stage-lost': 'var(--lms-stage-lost)',
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
