#!/usr/bin/env node
/**
 * Mengukur kontras WCAG setiap pasangan warna antarmuka Ritual pada tema Terang dan Gelap.
 * Sumber kebenaran: token di src/index.css (dibaca langsung, tidak ada salinan angka di sini) dan palet warna kebiasaan di
 * src/lib/habit-icons.ts. Keluar dengan kode 1 bila ada pasangan yang gagal.
 *
 *   npm run contrast                 cetak tabel
 *   npm run contrast -- --write      juga menulis docs/KONTRAS-WARNA.md
 *
 * Batas: teks >= 4,5:1 (WCAG 1.4.3 AA), komponen/grafis non-teks >= 3:1 (WCAG 1.4.11).
 * Yang TIDAK diukur di sini: warna di dalam gambar/ikon PWA dan render nyata di browser (itu tugas e2e/10-visual.spec.ts).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(root, 'src/index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const habitSrc = readFileSync(join(root, 'src/lib/habit-icons.ts'), 'utf8')

// ---- token ----
const block = (selector) => {
  const m = css.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!m) throw new Error(`Blok ${selector} tidak ditemukan di index.css`)
  const t = {}
  for (const line of m[1].split(';')) {
    const mm = line.match(/--([a-z0-9-]+)\s*:\s*([\s\S]+)$/i)
    if (mm) t[mm[1]] = mm[2].trim()
  }
  return t
}
const themes = { Terang: block(':root'), Gelap: { ...block(':root'), ...block('\\.dark') } }

// ---- warna ----
const hex = (h) => { const n = h.replace('#', ''); return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: 1 } }
const mixRGB = (a, pa, b) => ({ r: a.r * pa + b.r * (1 - pa), g: a.g * pa + b.g * (1 - pa), b: a.b * pa + b.b * (1 - pa), a: 1 })
function resolve(value, tokens) {
  const v = value.trim()
  let m
  if ((m = v.match(/^var\(--([a-z0-9-]+)\)$/i))) return resolve(tokens[m[1]], tokens)
  if (/^#[0-9a-f]{6}$/i.test(v)) return hex(v)
  if ((m = v.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/i))) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] }
  if ((m = v.match(/^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*(.+)\)$/i))) return mixRGB(resolve(m[1], tokens), +m[2] / 100, resolve(m[3], tokens))
  throw new Error(`Nilai warna tidak dikenali: ${v}`)
}
const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 })
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const lab = (c) => {
  const [r, g, b] = [lin(c.r), lin(c.g), lin(c.b)]
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}
const deltaE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }
const hue = (c) => { const [, a, b] = lab(c); return (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 }
const toHex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

// ---- palet kebiasaan (data, disimpan di DB) ----
const habitColors = [...habitSrc.matchAll(/value:\s*'(#[0-9a-fA-F]{6})',\s*label:\s*'([^']+)'/g)].map((m) => ({ hex: m[1], label: m[2] }))
const CATS = ['health', 'fitness', 'learning', 'productivity', 'finance', 'mindfulness', 'other']
const INK = 0.68, TINT = 0.16 // harus sama dengan src/lib/habit-icons.ts (inkColor/tintColor)

const rows = []
let failures = 0
for (const [theme, tk] of Object.entries(themes)) {
  const C = (name) => resolve(`var(--${name})`, tk)
  const add = (kind, label, fg, bg, min, note = '') => {
    const r = ratio(fg, bg)
    const ok = r >= min
    if (!ok) failures++
    rows.push({ theme, kind, label, fg: toHex(fg), bg: toHex(bg), ratio: r, min, ok, note })
  }
  const text = (a, b) => add('teks', `${a} di ${b}`, C(a), C(b), 4.5)
  const nonText = (a, b, note) => add('non-teks', `${a} di ${b}`, C(a), C(b), 3, note)

  // Teks
  for (const bg of ['bg', 'surface', 'surface-2', 'surface-hover']) { text('fg', bg); text('muted', bg) }
  for (const bg of ['bg', 'surface', 'surface-2']) text('fg-2', bg)
  for (const bg of ['bg', 'surface', 'surface-2', 'surface-hover', 'accent-soft']) text('accent-text', bg)
  text('fg-2', 'accent-soft'); text('fg', 'accent-soft')
  for (const bg of ['bg', 'surface', 'surface-2']) text('danger', bg)
  text('success', 'surface')
  text('accent-fg', 'accent'); text('accent-fg', 'accent-hover')
  text('danger-fg', 'danger'); text('danger-fg', 'danger-hover')
  text('muted', 'accent-soft')
  // Kategori: ikon + label berwarna di atas permukaan dan tint-nya
  for (const c of CATS) {
    const soft = mixRGB(C(`cat-${c}`), 0.14, C('surface'))
    add('teks', `cat-${c} di tint kategori`, C(`cat-${c}`), soft, 4.5)
    text(`cat-${c}`, 'surface'); text(`cat-${c}`, 'surface-2')
    add('teks', `cat-${c} di tint kategori di atas surface-2`, C(`cat-${c}`), mixRGB(C(`cat-${c}`), 0.14, C('surface-2')), 4.5)
  }
  // Kolom isian
  nonText('input-border', 'surface', 'batas kolom isian terhadap kartu')
  nonText('input-border', 'bg', 'batas kolom isian di atas kanvas (mis. pencarian di halaman Kebiasaan)')
  nonText('input-border', 'surface-2', 'batas kolom isian terhadap isiannya')
  text('muted', 'surface-2') // placeholder
  // Fokus, kontrol terpilih
  nonText('accent-text', 'surface', 'cincin fokus + batas opsi terpilih'); nonText('accent-text', 'bg', 'cincin fokus di kanvas')
  nonText('accent', 'surface', 'batang grafik, tombol'); nonText('accent', 'surface-2', 'isi progres/grafik')
  // Penanda kalender & progres
  for (const bg of ['surface', 'surface-hover']) { nonText('success', bg, 'penanda "semua selesai" / progres'); nonText('muted', bg, 'penanda "terlewat"') }
  nonText('success', 'surface-hover', 'isi progres di atas trek')
  nonText('success', 'accent-soft', 'isi progres di kartu hero')
  // Heatmap
  for (const n of [1, 2, 3, 4]) nonText(`heat-${n}`, 'surface', `heatmap tingkat ${n}`)
  for (let n = 1; n < 4; n++) {
    const d = deltaE(C(`heat-${n}`), C(`heat-${n + 1}`))
    rows.push({ theme, kind: 'pembeda', label: `heat-${n} vs heat-${n + 1}`, fg: toHex(C(`heat-${n}`)), bg: toHex(C(`heat-${n + 1}`)), ratio: d, min: 8, ok: d >= 8, note: 'ΔE (selisih tingkat bisa dibedakan)', unit: 'ΔE' })
    if (d < 8) failures++
  }
  // Palet warna kebiasaan: ikon ("tinta") di atas tint, dan swatch di atas kartu
  for (const hc of habitColors) {
    const base = hex(hc.hex)
    const ink = mixRGB(base, INK, C('fg')), tint = mixRGB(base, TINT, C('surface'))
    add('non-teks', `kebiasaan ${hc.label}: ikon di atas tint`, ink, tint, 3, hc.hex)
    add('non-teks', `kebiasaan ${hc.label}: swatch di atas kartu`, ink, C('surface'), 3, hc.hex)
  }
  // Navigasi bawah kapsul: label di atas latar kaca pada kasus terburuk
  const backs = { kanvas: C('bg'), kartu: C('surface'), 'area teks padat': mixRGB(C('fg'), 0.35, C('surface')), 'tombol aksen': C('accent') }
  for (const [name, back] of Object.entries(backs)) {
    const solid = over(resolve(tk['nav-bg'], tk), back), glass = over(resolve(tk['nav-glass'], tk), back)
    add('teks', `label nav (muted) di atas kapsul solid, di depan ${name}`, C('muted'), solid, 4.5)
    add('teks', `label nav (muted) di atas kaca, di depan ${name}`, C('muted'), glass, 4.5)
    add('teks', `label aktif (accent-text) di atas pil aktif+kaca, di depan ${name}`, C('accent-text'), over(resolve(tk['accent-soft'], tk), glass), 4.5)
  }
  // Pembeda hue (informasi, bukan kegagalan WCAG): kategori vs aksen aksi utama
  const acc = C('accent-text')
  for (const c of CATS) {
    const d = deltaE(C(`cat-${c}`), acc), h = Math.abs(hue(C(`cat-${c}`)) - hue(acc)), hd = Math.min(h, 360 - h)
    const ok = d >= 30
    if (!ok) failures++
    rows.push({ theme, kind: 'pembeda', label: `kategori ${c} vs aksen utama`, fg: toHex(C(`cat-${c}`)), bg: toHex(acc), ratio: d, min: 30, ok, note: `ΔE; selisih hue ${hd.toFixed(0)}°`, unit: 'ΔE' })
  }
  let minPair = { d: 1e9 }
  for (let i = 0; i < CATS.length; i++) for (let j = i + 1; j < CATS.length; j++) {
    const d = deltaE(C(`cat-${CATS[i]}`), C(`cat-${CATS[j]}`))
    if (d < minPair.d) minPair = { d, a: CATS[i], b: CATS[j] }
  }
  rows.push({ theme, kind: 'pembeda', label: `kategori terdekat satu sama lain: ${minPair.a} vs ${minPair.b}`, fg: '-', bg: '-', ratio: minPair.d, min: 15, ok: minPair.d >= 15, note: 'ΔE', unit: 'ΔE' })
  if (minPair.d < 15) failures++
  const dsa = deltaE(C('success'), C('accent-text'))
  rows.push({ theme, kind: 'pembeda', label: 'success vs aksen utama (info: keduanya hijau; penanda kalender dibedakan lewat bentuk)', fg: toHex(C('success')), bg: toHex(acc), ratio: dsa, min: 0, ok: true, note: 'ΔE', unit: 'ΔE' })
}

const fmt = (r) => `${r.ratio.toFixed(2)}${r.unit ? '' : ':1'}`
const line = (r) => `${r.ok ? 'LULUS' : 'GAGAL'}  ${r.theme.padEnd(6)} ${r.kind.padEnd(8)} ${fmt(r).padStart(8)} (min ${r.min}${r.unit ? '' : ':1'})  ${r.label}  [${r.fg} / ${r.bg}]${r.note ? '  ' + r.note : ''}`
const failed = rows.filter((r) => !r.ok)
console.log(rows.map(line).join('\n'))
console.log(`\n${rows.length} pengukuran, ${rows.length - failed.length} lulus, ${failed.length} gagal.`)

if (process.argv.includes('--write')) {
  const md = [
    '# Kontras warna Ritual (diukur dengan skrip)', '',
    'Dihasilkan oleh `npm run contrast -- --write` dari token di `src/index.css` dan palet di `src/lib/habit-icons.ts`. Jangan diedit manual.',
    'Batas: teks ≥ 4,5:1 (WCAG 1.4.3), komponen/grafis non-teks ≥ 3:1 (WCAG 1.4.11); "ΔE" = selisih persepsi warna CIE76 (bukan WCAG).', '',
    `Ringkasan: ${rows.length} pengukuran, ${rows.length - failed.length} lulus, ${failed.length} gagal.`, '',
  ]
  for (const theme of Object.keys(themes)) {
    md.push(`## Tema ${theme}`, '', '| Hasil | Jenis | Rasio | Min | Pasangan | Warna | Catatan |', '|---|---|---|---|---|---|---|')
    for (const r of rows.filter((x) => x.theme === theme)) md.push(`| ${r.ok ? 'lulus' : '**GAGAL**'} | ${r.kind} | ${fmt(r)} | ${r.min}${r.unit ? '' : ':1'} | ${r.label} | ${r.fg} / ${r.bg} | ${r.note} |`)
    md.push('')
  }
  writeFileSync(join(root, 'docs/KONTRAS-WARNA.md'), md.join('\n'))
  console.log('Ditulis: docs/KONTRAS-WARNA.md')
}
process.exit(failures ? 1 : 0)
