/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    safelist: [
      'grid-cols-1',
      'grid-cols-2', 
      'grid-cols-3',
      'grid-cols-4',
      'grid-cols-5',
      'grid-cols-6',
      // Ou de manière plus dynamique :
      {
        pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)/,
      }
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }