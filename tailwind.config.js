/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GitHub Primer colors (from ui_spec.md)
        github: {
          canvas: '#ffffff',
          primary: '#2da44e',
          border: '#d0d7de',
          text: '#24292f',
          'text-secondary': '#57606a',
          'canvas-subtle': '#f6f8fa',
          'danger': '#cf222e',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
