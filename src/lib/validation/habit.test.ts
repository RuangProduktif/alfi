import { habitFormSchema } from '@/lib/validation/habit'

const valid = {
  name: ' Minum air ', description: '', category: 'health', icon: 'Droplets', color: '#3b82f6',
  frequency: 'daily', scheduledDays: [3, 1], startDate: '2026-10-31',
}
const messages = (v: unknown) => {
  const r = habitFormSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('habitFormSchema', () => {
  it('menerima data valid, merapikan nama, deskripsi kosong -> null, harian -> tanpa hari', () => {
    const r = habitFormSchema.parse(valid)
    expect(r.name).toBe('Minum air')
    expect(r.description).toBeNull()
    expect(r.scheduledDays).toEqual([])
  })
  it('menolak nama kosong atau hanya spasi', () => expect(messages({ ...valid, name: '   ' })).toContain('Nama kebiasaan wajib diisi.'))
  it('menolak nama > 60 karakter', () => expect(messages({ ...valid, name: 'a'.repeat(61) })).toContain('Nama maksimal 60 karakter.'))
  it('menolak deskripsi > 200 karakter', () => expect(messages({ ...valid, description: 'a'.repeat(201) })).toContain('Deskripsi maksimal 200 karakter.'))
  it('hari tertentu wajib minimal satu hari', () =>
    expect(messages({ ...valid, frequency: 'weekly_days', scheduledDays: [] })).toContain('Pilih minimal satu hari.'))
  it('hari tertentu: mengurutkan dan membuang duplikat', () =>
    expect(habitFormSchema.parse({ ...valid, frequency: 'weekly_days', scheduledDays: [5, 1, 5] }).scheduledDays).toEqual([1, 5]))
  it('menolak tanggal mulai tidak valid', () => expect(messages({ ...valid, startDate: '2026-02-30' })).toContain('Tanggal mulai tidak valid.'))
  it('menolak kategori, ikon, dan warna di luar daftar', () => {
    expect(messages({ ...valid, category: 'x' })).toContain('Pilih kategori.')
    expect(messages({ ...valid, icon: 'x' })).toContain('Pilih ikon.')
    expect(messages({ ...valid, color: 'merah' })).toContain('Pilih warna.')
  })
})
