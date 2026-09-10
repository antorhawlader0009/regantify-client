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
