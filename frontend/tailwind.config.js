/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f8f9fb',
        'surface-dim': '#d9dadc',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f4f6',
        'surface-container': '#edeef0',
        'surface-container-high': '#e7e8ea',
        'surface-container-highest': '#e1e2e4',
        'on-surface': '#191c1e',
        'on-surface-variant': '#43474d',
        'inverse-surface': '#2e3132',
        'inverse-on-surface': '#f0f1f3',
        outline: '#73777e',
        'outline-variant': '#c3c7ce',
        primary: {
          DEFAULT: '#001b31',
          container: '#12304a',
          'on-container': '#7d98b7',
        },
        secondary: {
          DEFAULT: '#1f6392',
          container: '#8fc9fe',
          'on-container': '#015583',
        },
        tertiary: {
          DEFAULT: '#261700',
          container: '#412a00',
          'on-container': '#c78a18',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on-container': '#93000a',
        },
        success: '#1b6b45',
        warning: '#8a6100',
      },
      fontFamily: {
        display: ['Urbanist', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      fontSize: {
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};