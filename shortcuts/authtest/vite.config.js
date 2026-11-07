import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  build: {
    outDir: "assets",
    emptyOutDir: true,
    lib: { entry: "main.js", formats: ["es"], fileName: () => "auth-demo.js" },
  },
})
