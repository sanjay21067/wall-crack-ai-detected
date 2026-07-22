import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express server during development
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
    },
  },
});
