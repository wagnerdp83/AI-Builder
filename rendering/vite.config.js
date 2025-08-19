import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    fs: {
      // Allow serving files from project root and parent directories
      allow: [
        // Project root
        path.resolve(__dirname),
        // Parent directory (where the interface project is)
        path.resolve(__dirname, ".."),
      ],
    },
    cors: true,
  },
});
