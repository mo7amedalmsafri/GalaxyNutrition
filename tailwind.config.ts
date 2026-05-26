import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        galaxy: {
          black:  '#09090D',
          deep:   '#0E0E14',
          purple: '#131319',
          violet: '#1A1A22',
          indigo: '#1A1A22',
          blue:   '#0D101A',
          nebula: '#97E325',   // lime — primary
          pink:   '#FF5F1F',   // orange — secondary
          rose:   '#FF8040',
          gold:   '#F59E0B',
          cyan:   '#00D4FF',
          star:   '#e2e8f0',
        },
        sport: {
          lime:   '#97E325',
          orange: '#FF5F1F',
          cyan:   '#00D4FF',
          gold:   '#F59E0B',
        },
      },
      backgroundImage: {
        'galaxy': 'radial-gradient(ellipse at 20% 50%, #1A1A22 0%, #09090D 50%, #0D101A 100%)',
        'galaxy-card': 'linear-gradient(135deg, rgba(20,20,26,0.7) 0%, rgba(13,16,26,0.6) 100%)',
        'nebula-glow': 'radial-gradient(circle, rgba(151,227,37,0.2) 0%, transparent 70%)',
        'gold-gradient': 'linear-gradient(135deg, #F59E0B, #FBBF24, #F59E0B)',
        'sport-gradient': 'linear-gradient(135deg, #97E325, #00D4FF)',
        'fire-gradient': 'linear-gradient(135deg, #FF5F1F, #F59E0B)',
        'green-gradient': 'linear-gradient(135deg, #10b981, #059669)',
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      animation: {
        'twinkle':    'twinkle 3s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
        'slide-up':   'slide-up 0.5s ease-out',
        'fade-in':    'fade-in 0.6s ease-out',
        'shimmer':    'shimmer 2s linear infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(151,227,37,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(151,227,37,0.65), 0 0 60px rgba(255,95,31,0.25)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}

export default config
