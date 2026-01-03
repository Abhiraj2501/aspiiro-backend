/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        lg: '0px',
        md: '0px',
        sm: '0px'
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#000000',
        card: '#FFFFFF',
        'card-foreground': '#000000',
        popover: '#FFFFFF',
        'popover-foreground': '#000000',
        primary: '#000000',
        'primary-foreground': '#FFFFFF',
        secondary: '#F4F4F5',
        'secondary-foreground': '#18181B',
        muted: '#F4F4F5',
        'muted-foreground': '#71717A',
        accent: '#F4F4F5',
        'accent-foreground': '#18181B',
        destructive: '#EF4444',
        'destructive-foreground': '#FAFAFA',
        border: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#18181B',
        'brand-accent': '#FF3300',
        'sale-badge': '#FF3300',
        success: '#00C853'
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};