module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Vos extensions de thème existantes...
    },
  },
  plugins: [],
  // Ajouter cette section pour activer le variant 'active'
  variants: {
    extend: {
      boxShadow: ['active'],
      scale: ['active'],
      transform: ['active'],
    },
  },
}