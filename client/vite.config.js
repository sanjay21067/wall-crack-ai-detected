import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express server during development
      "/api": "https://wall-crack-ai-detected-backend.onrender.com",
      "/uploads": "https://wall-crack-ai-detected-backend.onrender.com",
    },
  },
});
