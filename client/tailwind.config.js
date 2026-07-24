/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ngọc lục bảo — mái chùa, cây cối vùng Yên Tử
        jade: {
          50: '#eefaf5',
          100: '#d5f2e5',
          200: '#aee5cd',
          300: '#78d0ac',
          400: '#43b487',
          500: '#1f9a6d',
          600: '#0e7c5e', // chủ đạo
          700: '#0b634c',
          800: '#0c4f3e',
          900: '#0b4134',
          950: '#04251d',
        },
        // Vàng son — sơn son thếp vàng, hoành phi câu đối
        gold: {
          50: '#fbf7ed',
          100: '#f5ebcf',
          200: '#ecd79c',
          300: '#e2be63',
          400: '#d9a441', // nhấn
          500: '#cc8c2e',
          600: '#b06e26',
          700: '#8d5122',
          800: '#754121',
          900: '#63371f',
        },
        // Đất nung — gốm Đông Triều
        terra: {
          400: '#c9694f',
          500: '#b4543a',
          600: '#9a4430',
        },
        paper: '#faf7f0',
        ink: '#16211e',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(11, 65, 52, 0.18)',
        lift: '0 18px 40px -16px rgba(11, 65, 52, 0.35)',
      },
      backgroundImage: {
        'jade-radial': 'radial-gradient(ellipse at top, rgba(14,124,94,0.12), transparent 60%)',
      },
      keyframes: {
        'ken-burns': {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.12) translate(-1.5%, -1.5%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'ken-burns': 'ken-burns 12s ease-out infinite alternate',
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
