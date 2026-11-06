import { DEFAULT_SETTINGS, createSupabaseSettingsRepository, toSettings } from '@/features/settings/settings-repository'
import { fakeClient } from '@/test/fake-supabase'

const row = (over: object = {}) => ({ user_id: 'u1', theme: 'dark', timezone: 'Asia/Makassar', locale: 'id-ID', ...over })

describe('createSupabaseSettingsRepository', () => {
  it('memetakan baris pengaturan yang ada', async () => {
    const { client, calls } = fakeClient([{ data: row() }])
    expect(await createSupabaseSettingsRepository(client, 'u1').getSettings()).toEqual({ theme: 'dark', timezone: 'Asia/Makassar', locale: 'id-ID' })
    expect(calls).toContainEqual(['eq', ['user_id', 'u1']])
    expect(calls.some(([n]) => n === 'insert')).toBe(false)
  })

  it('akun lama tanpa baris pengaturan: membuat baris dengan nilai bawaan database', async () => {
    const { client, calls } = fakeClient([{ data: null }, { data: row({ theme: 'system', timezone: 'Asia/Jakarta' }) }])
    const s = await createSupabaseSettingsRepository(client, 'u1').getSettings()
    expect(s).toEqual(DEFAULT_SETTINGS)
    expect(calls.find(([n]) => n === 'insert')?.[1][0]).toEqual({ user_id: 'u1' })
  })

  it('balapan pembuatan (unique violation): membaca ulang baris yang sudah ada', async () => {
    const { client } = fakeClient([{ data: null }, { error: { message: 'duplicate', code: '23505' } }, { data: row() }])
    expect((await createSupabaseSettingsRepository(client, 'u1').getSettings()).timezone).toBe('Asia/Makassar')
  })

  it('update hanya mengirim patch dan membatasi pada user_id sendiri', async () => {
    const { client, calls } = fakeClient([{ data: row({ timezone: 'Asia/Jayapura' }) }])
    const s = await createSupabaseSettingsRepository(client, 'u1').updateSettings({ timezone: 'Asia/Jayapura' })
    expect(s.timezone).toBe('Asia/Jayapura')
    expect(calls.find(([n]) => n === 'update')?.[1][0]).toEqual({ timezone: 'Asia/Jayapura' })
    expect(calls).toContainEqual(['eq', ['user_id', 'u1']])
  })

  it('error server dilempar (bukan diabaikan)', async () => {
    const { client } = fakeClient([{ error: { message: 'Zona waktu tidak valid' } }])
    await expect(createSupabaseSettingsRepository(client, 'u1').updateSettings({ timezone: 'Mars/X' })).rejects.toThrow('Zona waktu tidak valid')
  })

  it('toSettings memetakan kolom', () => expect(toSettings(row())).toMatchObject({ theme: 'dark' }))
})
