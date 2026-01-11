/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        display: ["'SF Pro Display'", "'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        cloud: "#f8fafc",
        porcelain: "#ffffffcc",
        slateInk: "#1f2937",
        brand: "#122F41",
        brandMid: "#1B4F73",
        brandLight: "#2F7FB2",
        aurora: "#4f46e5",
        aqua: "#0ea5e9",
        blush: "#f472b6",
      },
      boxShadow: {
        glass: "0 15px 40px rgba(15, 23, 42, 0.08)",
        glow: "0 20px 60px rgba(79,70,229,0.25)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at 20% 20%, rgba(18,47,65,0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(47,127,178,0.18), transparent 40%)",
        mesh: "linear-gradient(135deg, rgba(18,47,65,0.08), rgba(47,127,178,0.1))",
      },
      borderRadius: {
        glass: "28px",
      },
    },
  },
  plugins: [],
};
