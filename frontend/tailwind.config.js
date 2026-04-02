/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CreditPath design system — credit industry palette
        // Primary: deep navy (trust, financial)
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1d4ed8',
          700: '#1e3a8a',
          800: '#1e3a8a',
          900: '#1e2a5e',
          950: '#0f172a',
        },
        // Score colors — traffic light system
        score: {
          excellent: '#16a34a', // 750+
          good:      '#65a30d', // 700-749
          fair:      '#ca8a04', // 640-699
          poor:      '#ea580c', // 580-639
          bad:       '#dc2626', // <580
        },
        // FCRA urgency colors — dispute tracker
        urgency: {
          safe:      '#16a34a', // 1-20 days
          warning:   '#ca8a04', // 21-27 days
          urgent:    '#ea580c', // 28-30 days
          overdue:   '#dc2626', // 31+ days
          escalated: '#7f1d1d', // 45+ days
        },
        // Bureau brand colors
        bureau: {
          equifax:   '#cc0000',
          experian:  '#0066a1',
          transunion:'#00a9e0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
