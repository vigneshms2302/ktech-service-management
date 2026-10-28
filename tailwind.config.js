/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        chatgpt: {
          main: 'var(--bg-main)',
          sidebar: 'var(--bg-sidebar)',
          border: 'var(--border-color)',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
          hover: 'var(--bg-surface-hover)',
          surface: 'var(--bg-surface)',
          emerald: '#10a37f',
          'emerald-hover': '#1a7f64',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'chatgpt': '12px',
        'chatgpt-pill': '9999px',
      },
      maxWidth: {
        'chatgpt-content': '800px',
      },
    },
  },
  plugins: [],
};
