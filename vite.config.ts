import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// `self` hanya ada di dalam service worker; fungsi urlPattern di bawah diserialisasi ke sana.
declare const self: { location: { origin: string } }

const inTests = Boolean(process.env.VITEST)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Plugin PWA tidak dimuat saat Vitest berjalan (modul virtual diganti stub di bawah).
    ...(inTests
      ? []
      : [
          VitePWA({
            // 'prompt': versi baru TIDAK mengambil alih diam-diam; pengguna memilih kapan memuat ulang.
            registerType: 'prompt',
            injectRegister: false, // pendaftaran dilakukan oleh useRegisterSW di aplikasi
            includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
            manifest: {
              id: '/',
              name: 'Ritual',
              short_name: 'Ritual',
              description: 'Pelacak kebiasaan untuk membangun konsistensi, memantau progres, dan menjaga rentetan.',
              lang: 'id',
              dir: 'ltr',
              start_url: '/app',
              scope: '/',
              display: 'standalone',
              theme_color: '#3f6b4e', // = --accent (tema terang) di src/index.css
              background_color: '#e8ede7', // = --bg (tema terang)
              categories: ['health', 'lifestyle', 'productivity'],
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              // Hanya berkas statis hasil build yang di-precache (app shell). Tidak ada data pengguna.
              globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
              // Subset font non-Latin tidak dipakai Bahasa Indonesia; jangan dibebankan ke pemasangan pertama.
              globIgnores: ['**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
              navigateFallback: '/index.html',
              cleanupOutdatedCaches: true,
              runtimeCaching: [
                {
                  // Semua permintaan lintas-origin (termasuk Supabase: auth, REST) selalu langsung ke jaringan
                  // dan tidak pernah disimpan, agar data privat tidak bisa bocor antar pengguna lewat cache.
                  urlPattern: ({ url }: { url: URL }) => url.origin !== self.location.origin,
                  handler: 'NetworkOnly',
                },
              ],
            },
            devOptions: { enabled: false },
          }),
        ]),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Uji browser (Playwright) dijalankan terpisah lewat `npm run e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    alias: { 'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'src/test/pwa-register-stub.ts') },
    // Uji build PWA memanggil `vite build` sungguhan sehingga butuh waktu lebih.
    testTimeout: 30_000,
  },
})
