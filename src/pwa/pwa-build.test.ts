// @vitest-environment node
/// <reference types="node" />
/**
 * Menjalankan `vite build` SUNGGUHAN ke direktori sementara lalu memeriksa manifest, service worker, dan ikon.
 * Ini membuktikan konfigurasi PWA benar pada artefak hasil build (bukan sekadar isi vite.config.ts).
 * NB: tidak menguji perilaku service worker di browser (pendaftaran, pembaruan, pemasangan).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
let out: string
let manifest: { [k: string]: unknown; icons: { src: string; sizes: string; type: string; purpose: string }[] }
let sw: string
let html: string
let precache: string[]

beforeAll(() => {
  out = mkdtempSync(path.join(tmpdir(), 'ritual-pwa-'))
  // VITEST dikosongkan agar vite.config.ts memuat plugin PWA pada build anak ini.
  execFileSync(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'silent'], {
    cwd: root, env: { ...process.env, VITEST: '', NODE_ENV: 'production' }, stdio: 'pipe',
  })
  manifest = JSON.parse(readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'))
  sw = readFileSync(path.join(out, 'sw.js'), 'utf8')
  html = readFileSync(path.join(out, 'index.html'), 'utf8')
  precache = [...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((m) => m[1]!)
}, 120_000)
afterAll(() => rmSync(out, { recursive: true, force: true }))

const pngInfo = (file: string) => {
  const b = readFileSync(file)
  return { signature: b.subarray(1, 4).toString(), width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] }
}

describe('manifest', () => {
  it('identitas dan perilaku aplikasi', () => {
    expect(manifest).toMatchObject({
      name: 'Ritual', short_name: 'Ritual', lang: 'id', start_url: '/app', scope: '/', display: 'standalone',
      theme_color: '#3f6b4e', background_color: '#e8ede7',
    })
  })
  it('start_url berada di dalam scope', () => expect(String(manifest.start_url).startsWith(String(manifest.scope))).toBe(true))
  it('ikon 192 dan 512 (any) serta 512 maskable ada', () => {
    const has = (sizes: string, purpose: string) => manifest.icons.some((i) => i.sizes === sizes && i.purpose === purpose && i.type === 'image/png')
    expect([has('192x192', 'any'), has('512x512', 'any'), has('512x512', 'maskable')]).toEqual([true, true, true])
  })
  it('setiap ikon ada di hasil build, berformat PNG, dan berukuran sesuai deklarasi', () => {
    for (const icon of manifest.icons) {
      const file = path.join(out, icon.src)
      expect(existsSync(file), icon.src).toBe(true)
      const info = pngInfo(file)
      expect(info.signature).toBe('PNG')
      expect(`${info.width}x${info.height}`).toBe(icon.sizes)
    }
  })
  it('ikon "any" punya kanal alfa (sudut transparan); ikon maskable dan apple-touch tidak transparan (latar penuh)', () => {
    expect(pngInfo(path.join(out, 'icons/icon-512.png')).colorType).toBe(6)
    expect(pngInfo(path.join(out, 'icons/icon-192.png')).colorType).toBe(6)
    expect(pngInfo(path.join(out, 'icons/apple-touch-icon.png')).colorType).toBe(2)
    expect(pngInfo(path.join(out, 'icons/apple-touch-icon.png'))).toMatchObject({ width: 180, height: 180 })
  })
})

describe('index.html', () => {
  it('menautkan manifest, ikon Apple, favicon, dan theme-color', () => {
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/)
    expect(html).toMatch(/rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/)
    expect(html).toMatch(/rel="icon"[^>]*href="\/icons\/favicon\.svg"/)
    expect(html).toMatch(/name="theme-color" content="#3f6b4e"/)
    expect(html).toMatch(/<html lang="id"/)
  })
  it('tidak menautkan berkas yang tidak ada', () => {
    for (const m of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) expect(existsSync(path.join(out, m[1]!)), m[1]).toBe(true)
  })
})

describe('service worker', () => {
  it('precache app shell: index.html, JS, dan CSS; semua berkasnya benar-benar ada', () => {
    expect(precache).toContain('index.html')
    expect(precache.some((u) => u.endsWith('.js'))).toBe(true)
    expect(precache.some((u) => u.endsWith('.css'))).toBe(true)
    for (const url of precache) expect(existsSync(path.join(out, url)), url).toBe(true)
  })
  it('subset font non-Latin tidak ikut di-precache, font Latin ikut', () => {
    expect(precache.some((u) => /inter-(cyrillic|greek|vietnamese)/.test(u))).toBe(false)
    expect(precache.some((u) => /inter-latin-wght/.test(u))).toBe(true)
  })
  it('tidak ada peta sumber atau berkas lingkungan di precache', () => {
    expect(precache.filter((u) => /\.map$|\.env/.test(u))).toEqual([])
  })
  it('semua permintaan lintas-origin (Supabase/API) hanya lewat jaringan: tidak pernah di-cache', () => {
    expect(sw).toMatch(/registerRoute\(\(\{url:\w+\}\)=>\w+\.origin!==self\.location\.origin,new \w+\.NetworkOnly,"GET"\)/)
    expect(sw).not.toMatch(/supabase/i)
    expect(sw).not.toMatch(/StaleWhileRevalidate|CacheFirst|NetworkFirst/)
  })
  it('hanya satu strategi runtime (NetworkOnly): tidak ada cache runtime untuk data', () => {
    expect([...sw.matchAll(/new \w+\.(\w+)/g)].map((m) => m[1]).filter((n) => /Only|First|Revalidate/.test(n!))).toEqual(['NetworkOnly'])
  })
  it('navigasi SPA jatuh ke /index.html', () => expect(sw).toMatch(/NavigationRoute\(\w+\.createHandlerBoundToURL\("\/index\.html"\)\)/))
  it('versi baru TIDAK mengambil alih otomatis: skipWaiting hanya dalam handler pesan SKIP_WAITING, tanpa clientsClaim', () => {
    expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1)
    expect(sw).toMatch(/addEventListener\("message",\w+=>\{\w+\.data&&"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)\}\)/)
    expect(sw).not.toMatch(/clientsClaim/)
  })
  it('membersihkan cache versi lama', () => expect(sw).toMatch(/cleanupOutdatedCaches\(\)/))
})

describe('kode pendaftaran di sisi klien', () => {
  /**
   * Modul `virtual:pwa-register` memuat dua bendera hasil build, berurutan, mis.
   *   A=`false`,B=`false`,x=A===`true`,y=B===`true`
   * dengan A = autoUpdate dan B = selfDestroying. Backreference (\1, \3) membuat asersi tahan terhadap
   * perubahan nama variabel oleh minifier. Celah yang ditutup: registerType 'autoUpdate' TIDAK mengubah logika
   * service worker, tetapi membalik bendera ini sehingga klien memuat ulang sendiri tanpa persetujuan pengguna.
   */
  const flags = () => {
    const file = readdirSync(path.join(out, 'assets')).find((f) => /^index-.*\.js$/.test(f))!
    const js = readFileSync(path.join(out, 'assets', file), 'utf8')
    const m = js.match(/(\w+)=`(true|false)`,(\w+)=`(true|false)`,\w+=\1===`true`,\w+=\3===`true`/)
    return m ? { autoUpdate: m[2], selfDestroying: m[4] } : null
  }
  it('bendera pendaftaran ditemukan pada bundel (jika tidak, dua asersi di bawah tidak berarti)', () => expect(flags()).not.toBeNull())
  it('autoUpdate = false: klien tidak memuat ulang sendiri; pengguna memilih lewat tombol "Muat Ulang"', () =>
    expect(flags()?.autoUpdate).toBe('false'))
  it('selfDestroying = false: service worker tidak menghapus dirinya sendiri', () => expect(flags()?.selfDestroying).toBe('false'))
})

describe('vercel.json', () => {
  const v = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
    rewrites: { source: string; destination: string }[]
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  it('mengarahkan semua rute SPA ke index.html agar /app/... tetap terbuka saat dimuat langsung', () =>
    expect(v.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' }))
  it('sw.js dan manifest tidak di-cache lama oleh CDN (agar pembaruan terdeteksi)', () => {
    for (const file of ['/sw.js', '/manifest.webmanifest']) {
      const rule = v.headers.find((h) => h.source === file)
      expect(rule?.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' })
    }
  })
})
