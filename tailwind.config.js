/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './public/index.html',
    './public/**/*.html',
    './public/**/*.js',
    './src/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        grayLight: '#F3F4F6',
        grayMid: '#6B7280',
        grayDark: '#111827'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Ubuntu',
          'Cantarell',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};
