/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        uasz: {
          green: '#047857',   // Vert officiel UASZ
          greenHover: '#065f46',
          blue: '#1d4ed8',    // Bleu d'accentuation
          red: '#dc2626',     // Rouge pour alertes et rejets
          dark: '#111827',    // Noir / Anthracite pour titres forts
          light: '#f8fafc',   // Fond blanc cassé lumineux
          card: '#ffffff',    // Blanc pur pour cartes
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
