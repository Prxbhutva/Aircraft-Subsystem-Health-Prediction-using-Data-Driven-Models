export default {
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      colors: { brand: { 600: "#2563eb", 700: "#1e40af" } },
      boxShadow: {
        glow: "0 10px 40px rgba(37,99,235,0.18)",
        card: "0 6px 30px rgba(2,6,23,0.08)"
      },
      borderRadius: { xl2: "1.25rem" }
    }
  },
  plugins: []
}
