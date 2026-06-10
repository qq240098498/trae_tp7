/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        sandalwood: {
          50: "#F8F3EE",
          100: "#EFE4D7",
          200: "#DEC5AC",
          300: "#CCA37E",
          400: "#BA8551",
          500: "#6B4423",
          600: "#5A381D",
          700: "#4A2E18",
          800: "#3A2413",
          900: "#2A1A0E",
        },
        jade: {
          50: "#F1F6F1",
          100: "#DDEADD",
          200: "#BBD4BB",
          300: "#99BE99",
          400: "#77A877",
          500: "#5B8C5A",
          600: "#497248",
          700: "#3B5C3A",
          800: "#2D462C",
          900: "#1F301E",
        },
        gold: {
          50: "#FDFAF3",
          100: "#F9F0D9",
          200: "#F2E0B2",
          300: "#EBD18C",
          400: "#E4C166",
          500: "#C9A961",
          600: "#AB8D4A",
          700: "#8A703B",
          800: "#69542C",
          900: "#48381E",
        },
        cream: {
          50: "#FFFFFF",
          100: "#FAF7F2",
          200: "#F5EFE4",
          300: "#EFE6D3",
          400: "#E6D9BE",
          500: "#D9C79B",
          600: "#B8A36E",
          700: "#8E7D52",
          800: "#635637",
          900: "#3A3220",
        },
        ink: {
          50: "#F4F3F2",
          100: "#D9D7D4",
          200: "#B3B0AA",
          300: "#8D887F",
          400: "#676258",
          500: "#2D2A26",
          600: "#252320",
          700: "#1E1C19",
          800: "#161513",
          900: "#0E0E0C",
        },
      },
      fontFamily: {
        serif: [
          "Noto Serif SC",
          "思源宋体",
          "Source Han Serif SC",
          "SimSun",
          "宋体",
          "serif",
        ],
        sans: [
          "Noto Sans SC",
          "思源黑体",
          "Source Han Sans SC",
          "Microsoft YaHei",
          "微软雅黑",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 8px rgba(107, 68, 35, 0.08), 0 1px 3px rgba(45, 42, 38, 0.04)",
        "card-hover": "0 8px 24px rgba(107, 68, 35, 0.12), 0 4px 12px rgba(45, 42, 38, 0.08)",
        modal: "0 20px 60px rgba(45, 42, 38, 0.20), 0 8px 24px rgba(107, 68, 35, 0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
