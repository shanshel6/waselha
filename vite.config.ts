import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  // IMPORTANT: set this to your repo name if hosting under /REPO_NAME/
  // If you're using custom domain pointing directly to GitHub Pages, you can set base: '/' instead.
  base: "/REPO_NAME/",
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));