/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts", // Optional: if you have setup files
    // you might want to disable it, if you don't have tests that rely on CSS
    // since parsing CSS is slow
    css: true,
  },
  plugins: [react()],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(".", "src/lib/index.ts"),
      name: "useWebworker",
      // the proper extensions will be added
      fileName: (format) => `useWebworker.${format}.js`,
      formats: ["es", "umd"],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["react", "react-dom"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    sourcemap: true,
    // Reduce bloat from legacy browsers
    target: "esnext",
    // Minify options
    minify: true,
  },
});
