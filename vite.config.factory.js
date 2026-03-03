import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export function createViteConfig(port, appName = "app") {
  const isDev = process.env.NODE_ENV !== "production";

  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": path.resolve(__dirname, "../shared")
      }
    },
    server: {
      port,
      strictPort: true,
      open: isDev,
      proxy: isDev
        ? {
            "/api": {
              target: "http://localhost:5000",
              changeOrigin: true,
              rewrite: (path) => path
            }
          }
        : {}
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            ui: ["lucide-react"],
            ...(appName === "customer" || appName === "worker" ? { map: ["leaflet", "react-leaflet"] } : {})
          }
        }
      },
      sourcemap: !isDev,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: !isDev
        }
      }
    },
    css: {
      postcss: true
    }
  });
}

export default createViteConfig;
