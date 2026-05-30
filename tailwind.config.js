/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--color-page)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        elevated: 'var(--color-elevated)',
        input: 'var(--color-input)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-dim': 'var(--accent-dim)',
        'accent-muted': 'var(--accent-muted)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'status-green': 'var(--status-green)',
        'status-green-dim': 'var(--status-green-dim)',
        'status-amber': 'var(--status-amber)',
        'status-amber-dim': 'var(--status-amber-dim)',
        'status-red': 'var(--status-red)',
        'status-red-dim': 'var(--status-red-dim)',
        'status-blue': 'var(--status-blue)',
        'status-blue-dim': 'var(--status-blue-dim)',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '14px',
        lg: '20px',
        xl: '28px',
        pill: '99px',
      },
      spacing: {
        edge: '20px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
