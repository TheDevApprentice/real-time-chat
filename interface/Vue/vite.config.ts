import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath } from "url";
// import { VitePWA } from "vite-plugin-pwa";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    tailwindcss(),
    viteCompression({
      algorithm: "brotliCompress", // brotli + gzip pour la prod
      ext: ".br",
      threshold: 10240,
      deleteOriginFile: false,
    }),
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 10240,
      deleteOriginFile: false,
    }),
    visualizer({
      filename: "./dist/bundle-analyzer.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // VitePWA({
    //   registerType: "autoUpdate",
    //   includeAssets: [
    //     "favicon.svg",
    //     "favicon.ico",
    //     "robots.txt",
    //     "apple-touch-icon.png",
    //   ],
    //   manifest: {
    //     name: "Real-Time Chat",
    //     short_name: "Chat",
    //     description: "Chat en temps réel moderne et rapide",
    //     lang: "fr",
    //     start_url: "/",
    //     scope: "/",
    //     display: "standalone",
    //     background_color: "#181A20",
    //     theme_color: "#4466d6",
    //     orientation: "portrait",
    //     icons: [
    //       {
    //         src: "assets/icons/android/android-launchericon-192-192.png",
    //         sizes: "192x192",
    //         type: "image/png",
    //         purpose: "any",
    //       },
    //       {
    //         src: "assets/icons/android/android-launchericon-512-512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //         purpose: "any",
    //       },
    //       {
    //         src: "assets/icons/android/android-launchericon-512-512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //         purpose: "maskable",
    //       },
    //     ],
    //     "screenshots": [
    //       {
    //         "src": "assets/icons/screenshot1.png",
    //         "sizes": "445x795",
    //         "type": "image/png",
    //         "form_factor": "narrow",
    //         "label": "Application mobile Bahabun"
    //       },
    //       {
    //         "src": "assets/icons/screenshot2.png",
    //         "sizes": "448x797",
    //         "type": "image/png", 
    //         "form_factor": "wide",
    //         "label": "Application desktop Bahabun"
    //       }
    //     ]
    //   },
    //   workbox: {
    //     clientsClaim: true,
    //     skipWaiting: true,
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    //         handler: "CacheFirst",
    //         options: {
    //           cacheName: "google-fonts",
    //           expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
    //         },
    //       },
    //       {
    //         urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
    //         handler: "CacheFirst",
    //         options: {
    //           cacheName: "jsdelivr-cdn",
    //           expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
    //         },
    //       },
    //       {
    //         urlPattern: ({ request }) => request.destination === "image",
    //         handler: "CacheFirst",
    //         options: {
    //           cacheName: "images",
    //           expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
    //         },
    //       },
    //       {
    //         urlPattern: ({ request }) =>
    //           request.destination === "script" ||
    //           request.destination === "style",
    //         handler: "StaleWhileRevalidate",
    //         options: {
    //           cacheName: "static-resources",
    //           expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
    //         },
    //       },
    //     ],
    //   },
    //   devOptions: {
    //     enabled: true,
    //     type: "module",
    //   },
    // }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@components": path.resolve(__dirname, "src/components"),
      "@layouts": path.resolve(__dirname, "src/components/layouts"),
      "@ui": path.resolve(__dirname, "src/components/ui"),
      "@home": path.resolve(__dirname, "src/components/home"),
      "@login": path.resolve(__dirname, "src/components/login"),
      "@reusable": path.resolve(__dirname, "src/components/reusable"),
      "@router": path.resolve(__dirname, "src/router"),
      "@services": path.resolve(__dirname, "src/services"),
      "@stores": path.resolve(__dirname, "src/stores"),
      "@views": path.resolve(__dirname, "src/views"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: mode === "production" ? false : true, // Pas de sourcemap en prod
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router", "pinia"],
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        // preloading critical assets
        // plugins: [require('rollup-plugin-preload')()],
      },
    },
    brotliSize: true,
    reportCompressedSize: true,
    emptyOutDir: true,
  },
  server: {
    host: "localhost",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "8a1d4529a9e9.ngrok-free.app",
    ],
    cors: true,
    strictPort: false,
    hmr: {
      overlay: true,
    },
    // headers: {
    //   'X-Frame-Options': 'DENY',
    //   'X-Content-Type-Options': 'nosniff',
    //   'Referrer-Policy': 'no-referrer',
    // },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  css: {
    preprocessorOptions: {
      scss: {},
      less: {},
    },
    devSourcemap: true,
  },
  // optimizeDeps: {
  //   include: [],
  //   exclude: [],
  // },
}));
