// Membangun aplikasi dengan URL Supabase TIRUAN lalu menyajikannya lewat `vite preview`.
// Variabel dipasang lewat process.env supaya mengalahkan .env.local milik pengguna
// (uji browser tidak boleh pernah menyentuh proyek Supabase nyata).
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:4174'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mock_key_for_e2e_only'
const { build, preview } = await import('vite')
await build({ mode: 'e2e', logLevel: 'warn', build: { outDir: 'dist-e2e', emptyOutDir: true } })
const server = await preview({ mode: 'e2e', build: { outDir: 'dist-e2e' }, preview: { port: 4173, strictPort: true, host: '127.0.0.1' } })
server.printUrls()
process.on('SIGTERM', () => server.httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => server.httpServer.close(() => process.exit(0)))
