import type { Page } from '@playwright/test'

export interface ContrastIssue { selector: string; text: string; fg: string; bg: string; ratio: number; required: number; size: number; bold: boolean }
export interface PageAudit {
  overflowX: number // piksel kelebihan lebar dokumen (0 = tidak ada)
  overflowing: string[] // elemen yang melebihi lebar viewport
  contrastIssues: ContrastIssue[]
  textNodesChecked: number
  nonTextIssues: { selector: string; ratio: number }[] // batas kolom isian < 3:1 (WCAG 1.4.11)
  unnamed: string[] // tombol/tautan tanpa nama aksesibel
  smallTargets: { selector: string; w: number; h: number }[] // target sentuh < 24px (WCAG 2.2 AA 2.5.8)
  h1Count: number
  htmlLang: string
  sidebarVisible: boolean
  bottomNavVisible: boolean
}

/** Dijalankan DI DALAM browser. Tidak boleh memakai variabel luar. */
export async function auditPage(page: Page): Promise<PageAudit> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    type RGBA = [number, number, number, number]
    // Normalisasi format warna CSS apa pun (rgb, oklab, color-mix, color(srgb…)) lewat canvas.
    // Dua lintasan (di atas putih dan hitam) agar alfa dapat dipulihkan tanpa pembulatan premultiplied.
    const toRGBA = (css: string): RGBA => {
      const paint = (base: string) => {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = base; ctx.fillRect(0, 0, 1, 1)
        ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1)
        return ctx.getImageData(0, 0, 1, 1).data
      }
      const w = paint('#ffffff'), b = paint('#000000')
      const a = Math.min(1, Math.max(0, 1 - ((w[0]! - b[0]!) + (w[1]! - b[1]!) + (w[2]! - b[2]!)) / (3 * 255)))
      return a === 0 ? [0, 0, 0, 0] : [b[0]! / a, b[1]! / a, b[2]! / a, a]
    }
    const over = (top: RGBA, bottom: [number, number, number]): [number, number, number] =>
      [0, 1, 2].map((i) => top[i]! * top[3] + bottom[i]! * (1 - top[3])) as [number, number, number]
    const lum = (c: [number, number, number]) => {
      const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a: [number, number, number], b: [number, number, number]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
      return (hi + 0.05) / (lo + 0.05)
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return false
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e)
        if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false
        if (e.tagName === 'DIALOG' && !(e as HTMLDialogElement).open) return false
      }
      return true
    }
    const path = (el: Element) => {
      const parts: string[] = []
      for (let e: Element | null = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
        const cls = (e.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
        parts.unshift(e.tagName.toLowerCase() + (cls ? `.${cls}` : ''))
      }
      return parts.join(' > ')
    }
    const backdrop = (el: Element): [number, number, number] => {
      const layers: RGBA[] = []
      for (let e: Element | null = el; e; e = e.parentElement) {
        const s = getComputedStyle(e)
        const c = toRGBA(s.backgroundColor)
        if (c[3] > 0) layers.push([c[0], c[1], c[2], c[3] * 1])
        if (c[3] >= 0.999) break
      }
      let base: [number, number, number] = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? [0, 0, 0] : [255, 255, 255]
      const bodyBg = toRGBA(getComputedStyle(document.body).backgroundColor)
      if (bodyBg[3] >= 0.999) base = [bodyBg[0], bodyBg[1], bodyBg[2]]
      for (const l of layers.reverse()) base = over(l, base)
      return base
    }
    const opacityOf = (el: Element) => { let o = 1; for (let e: Element | null = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o }
    const hex = (c: [number, number, number]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

    const issues: ContrastIssue[] = []
    let checked = 0
    const check = (el: Element, text: string, fgCss: string) => {
      const style = getComputedStyle(el)
      const bg = backdrop(el)
      const fgc = toRGBA(fgCss)
      fgc[3] *= opacityOf(el)
      const fg = over(fgc, bg)
      const size = parseFloat(style.fontSize)
      const bold = Number(style.fontWeight) >= 700
      const large = size >= 24 || (size >= 18.66 && bold)
      const required = large ? 3 : 4.5
      const r = ratio(fg, bg)
      checked++
      if (r < required) issues.push({ selector: path(el), text: text.trim().slice(0, 40), fg: hex(fg), bg: hex(bg), ratio: Math.round(r * 100) / 100, required, size, bold })
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent?.trim()) continue
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName)) continue
      if (!visible(el) || el.closest('.sr-only') || el.closest(':disabled, [aria-disabled="true"]')) continue
      seen.add(el)
      check(el, n.textContent, getComputedStyle(el).color)
    }
    for (const input of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]')) {
      if (visible(input) && !input.disabled) check(input, `placeholder: ${input.placeholder}`, getComputedStyle(input, '::placeholder').color)
    }

    // WCAG 1.4.11: batas kolom isian harus >= 3:1 terhadap latar sekitarnya (atau isiannya sendiri berbeda >= 3:1).
    const nonTextIssues: { selector: string; ratio: number }[] = []
    for (const el of document.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), select, textarea')) {
      if (!visible(el) || (el as HTMLInputElement).disabled || el.closest('.sr-only')) continue
      const outside = backdrop(el.parentElement ?? document.body)
      const s = getComputedStyle(el)
      const border = toRGBA(s.borderTopColor)
      const borderOver = over(border, outside)
      const fill = over(toRGBA(s.backgroundColor), outside)
      const best = Math.max(border[3] > 0 && parseFloat(s.borderTopWidth) > 0 ? ratio(borderOver, outside) : 0, ratio(fill, outside))
      if (best < 3) nonTextIssues.push({ selector: path(el), ratio: Math.round(best * 100) / 100 })
    }

    const unnamed: string[] = []
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="radio"], select, input:not([type="hidden"]), textarea')) {
      if (!visible(el)) continue
      const h = el as HTMLElement
      const labelled = (h as HTMLInputElement).labels?.length ? true : false
      const name = (h.getAttribute('aria-label') || h.getAttribute('aria-labelledby') || h.getAttribute('title') || (h.innerText ?? '').trim() || h.querySelector('img[alt]')?.getAttribute('alt') || '').toString()
      if (!name && !labelled) unnamed.push(path(el))
    }

    // WCAG 2.2 SC 2.5.8 (AA): target < 24px lolos bila lingkaran 24px di tengahnya tidak menyentuh target lain,
    // atau bila berupa tautan sebaris di dalam teks. Pengecekan memakai kotak 24x24 (sedikit lebih ketat dari lingkaran).
    const TARGETS = 'button, a[href], [role="radio"], select, input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])'
    const all = [...document.querySelectorAll(TARGETS)].filter((el) => visible(el) && !el.closest('.sr-only'))
    const smallTargets: { selector: string; w: number; h: number }[] = []
    for (const el of all) {
      const r = el.getBoundingClientRect()
      if (r.width >= 24 && r.height >= 24) continue
      const inlineInText = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && (el.parentElement?.textContent ?? '').trim().length > (el.textContent ?? '').trim().length
      if (inlineInText) continue
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const box = { l: cx - 12, r: cx + 12, t: cy - 12, b: cy + 12 }
      const clash = all.some((o) => {
        if (o === el || o.contains(el) || el.contains(o)) return false
        const q = o.getBoundingClientRect()
        return q.left < box.r && q.right > box.l && q.top < box.b && q.bottom > box.t
      })
      if (clash) smallTargets.push({ selector: path(el), w: Math.round(r.width), h: Math.round(r.height) })
    }

    const vw = document.documentElement.clientWidth
    const overflowing: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue
      const r = el.getBoundingClientRect()
      if (r.right > vw + 1 && !el.closest('[class*="overflow-x-auto"]') && !el.closest('.sr-only')) overflowing.push(`${path(el)} (kanan ${Math.round(r.right)} > ${vw})`)
    }
    const sidebar = document.querySelector('aside, nav[aria-label="Navigasi utama"]')
    const bottom = document.querySelector('nav[aria-label="Navigasi bawah"]')
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - vw),
      overflowing: overflowing.slice(0, 8),
      contrastIssues: issues,
      textNodesChecked: checked,
      nonTextIssues,
      unnamed,
      smallTargets,
      h1Count: document.querySelectorAll('h1').length,
      htmlLang: document.documentElement.lang,
      sidebarVisible: !!sidebar && visible(sidebar),
      bottomNavVisible: !!bottom && visible(bottom),
    }
  })
}
