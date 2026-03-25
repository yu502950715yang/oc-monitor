/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d1117',
        'bg-secondary': '#161b22',
        'border-default': '#30363d',
        'text-primary': '#c9d1d9',
        'text-secondary': '#8b949e',
        'accent': '#58a6ff',
        'success': '#238636',
        'warning': '#d29922',
        'error': '#f85149',
        // StatsPanel colors
        'stat-token': '#fbbf24',
        'stat-tool': '#3b82f6',
        'stat-skill': '#a855f7',
        'stat-mcp': '#06b6d4',
      },
    },
  },
  plugins: [],
}