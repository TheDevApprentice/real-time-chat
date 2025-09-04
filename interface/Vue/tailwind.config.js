/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    safelist: [
      // Grid columns
      'grid-cols-1',
      'grid-cols-2', 
      'grid-cols-3',
      'grid-cols-4',
      'grid-cols-5',
      'grid-cols-6',
      'grid-cols-7',
      'grid-cols-8',
      'grid-cols-9',
      'grid-cols-10',
      'grid-cols-11',
      'grid-cols-12',
  
      // Grid rows
      'grid-rows-1',
      'grid-rows-2',
      'grid-rows-3',
      'grid-rows-4',
      'grid-rows-5',
      'grid-rows-6',
      'grid-rows-7',
      'grid-rows-8',
      'grid-rows-9',
      'grid-rows-10',
      'grid-rows-11',
      'grid-rows-12',
  
      // Column span
      'col-span-1',
      'col-span-2',
      'col-span-3',
      'col-span-4',
      'col-span-5',
      'col-span-6',
      'col-span-7',
      'col-span-8',
      'col-span-9',
      'col-span-10',
      'col-span-11',
      'col-span-12',
  
      // Row span
      'row-span-1',
      'row-span-2',
      'row-span-3',
      'row-span-4',
      'row-span-5',
      'row-span-6',
      'row-span-7',
      'row-span-8',
      'row-span-9',
      'row-span-10',
      'row-span-11',
      'row-span-12',
  
      // Gap
      'gap-1',
      'gap-2',
      'gap-3',
      'gap-4',
  
      // Patterns dynamiques
      {
        pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)/,
        variants: ['responsive'],
      },
      {
        pattern: /grid-rows-(1|2|3|4|5|6|7|8|9|10|11|12)/,
        variants: ['responsive'],
      },
      {
        pattern: /col-span-(1|2|3|4|5|6|7|8|9|10|11|12)/,
        variants: ['responsive'],
      },
      {
        pattern: /row-span-(1|2|3|4|5|6|7|8|9|10|11|12)/,
        variants: ['responsive'],
      }
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }