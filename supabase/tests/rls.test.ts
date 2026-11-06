// @vitest-environment node
/**
 * Menguji migration terhadap Postgres sungguhan (PGlite) dengan skema `auth` Supabase yang ditiru.
 * CATATAN: ini membuktikan logika SQL/RLS/constraint kita, BUKAN konfigurasi proyek Supabase
 * (Auth, PostgREST, JWT). Itu tetap harus diuji pada proyek Supabase nyata.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'

const migrationsDir = path.join(import.meta.dirname, '../migrations')
// Semua migration diterapkan berurutan menurut nama berkas, seperti yang dilakukan pengguna.
const migration = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n')

const supabaseAuthStub = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(supabaseAuthStub)
  await db.exec(migration)
})
afterAll(async () => { await db.close() })

async function createUser(name = 'Tes'): Promise<string> {
  const r = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [
    `${crypto.randomUUID()}@contoh.id`, JSON.stringify({ display_name: name }),
  ])
  return r.rows[0]!.id
}

/** Menjalankan query sebagai pengguna terautentikasi (role `authenticated` + klaim JWT), lalu kembali ke superuser. */
function asOn(database: PGlite, userId: string | null, role: 'authenticated' | 'anon' = 'authenticated') {
  return async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => {
    await database.exec(`set role ${role}`)
    await database.query(`select set_config('request.jwt.claims', $1, false)`, [userId ? JSON.stringify({ sub: userId, role }) : ''])
    try {
      return await database.query<T>(sql, params)
    } finally {
      await database.exec(`reset role`)
    }
  }
}
const as = (userId: string | null, role: 'authenticated' | 'anon' = 'authenticated') => asOn(db, userId, role)

const insertHabit = `insert into public.habits (user_id, name, category, icon, color, frequency, scheduled_days, start_date)
  values ($1, $2, 'health', 'Droplets', '#3b82f6', $3, $4::smallint[], current_date - 30) returning *`
const newHabit = async (userId: string, name = 'Minum air') =>
  (await as(userId)<{ id: string }>(insertHabit, [userId, name, 'daily', '{}'])).rows[0]!
// Varian serangan TANPA `returning`: kalau ada, Postgres juga memeriksa policy SELECT sehingga
// policy INSERT yang bocor bisa tertutupi. Di sini hanya policy INSERT/FK yang menentukan hasil.
const attackHabit = `insert into public.habits (user_id, name, category, icon, color, frequency, scheduled_days, start_date)
  values ($1, $2, 'health', 'Droplets', '#3b82f6', 'daily', '{}', current_date)`
const attackCompletion = `insert into public.habit_completions (habit_id, user_id, completed_date) values ($1, $2, current_date - 1)`
const countAll = async (table: string, where: string, params: unknown[]) =>
  Number((await db.query<{ n: string }>(`select count(*)::text as n from public.${table} where ${where}`, params)).rows[0]!.n)
const insertCompletion = `insert into public.habit_completions (habit_id, user_id, completed_date) values ($1, $2, current_date - $3::int) returning *`

describe('pengguna baru', () => {
  it('otomatis mendapat profil dan pengaturan bawaan', async () => {
    const id = await createUser('Budi')
    const p = await as(id)<{ display_name: string }>('select display_name from public.profiles')
    expect(p.rows).toEqual([{ display_name: 'Budi' }])
    const s = await as(id)('select theme, timezone, locale from public.user_settings')
    expect(s.rows).toEqual([{ theme: 'system', timezone: 'Asia/Jakarta', locale: 'id-ID' }])
  })
})

describe('isolasi data antar pengguna (RLS)', () => {
  // Serangan TANPA klausa WHERE/RETURNING: tanpa merujuk kolom, policy SELECT tidak ikut diterapkan,
  // sehingga hanya policy UPDATE/DELETE itu sendiri yang menahan serangan.
  it('UPDATE dan DELETE tanpa filter oleh B tidak menyentuh baris milik A', async () => {
    const a = await createUser(); const b = await createUser()
    const h = await newHabit(a, 'Milik A')
    await as(a)(insertCompletion, [h.id, a, 1])

    expect((await as(b)(`update public.habits set name = 'diretas'`)).affectedRows).toBe(0)
    expect((await as(b)(`update public.habits set archived_at = now()`)).affectedRows).toBe(0)
    expect((await as(b)(`delete from public.habits`)).affectedRows).toBe(0)
    expect((await as(b)(`delete from public.habit_completions`)).affectedRows).toBe(0)

    expect(await countAll('habits', `user_id = $1 and name = 'Milik A' and archived_at is null`, [a])).toBe(1)
    expect(await countAll('habit_completions', 'user_id = $1', [a])).toBe(1)
  })

  it('UPDATE tanpa filter oleh B tidak mengubah profil/pengaturan A', async () => {
    const a = await createUser('Asli'); const b = await createUser('B')
    expect((await as(b)(`update public.profiles set display_name = 'diretas'`)).affectedRows).toBe(1) // hanya milik B
    expect((await as(b)(`update public.user_settings set theme = 'dark'`)).affectedRows).toBe(1) // hanya milik B
    expect(await countAll('profiles', `id = $1 and display_name = 'Asli'`, [a])).toBe(1)
    expect(await countAll('user_settings', `user_id = $1 and theme = 'system'`, [a])).toBe(1)
  })

  it('pengguna B tidak dapat melihat, mengubah, atau menghapus habit milik A', async () => {
    const a = await createUser(); const b = await createUser()
    const h = await newHabit(a, 'Rahasia A')

    expect((await as(b)('select * from public.habits')).rows).toHaveLength(0)
    expect((await as(b)('select * from public.habits where id = $1', [h.id])).rows).toHaveLength(0)
    expect((await as(b)(`update public.habits set name = 'diretas' where id = $1`, [h.id])).affectedRows).toBe(0)
    expect((await as(b)('delete from public.habits where id = $1', [h.id])).affectedRows).toBe(0)

    const still = await as(a)<{ name: string }>('select name from public.habits where id = $1', [h.id])
    expect(still.rows).toEqual([{ name: 'Rahasia A' }])
  })

  it('B tidak dapat membuat habit atas nama A', async () => {
    const a = await createUser(); const b = await createUser()
    await expect(as(b)(attackHabit, [a, 'Palsu'])).rejects.toThrow(/row-level security/)
    expect(await countAll('habits', 'user_id = $1', [a])).toBe(0) // terbukti tidak tercipta
  })

  it('A tidak dapat memindahkan kepemilikan habit ke B', async () => {
    const a = await createUser(); const b = await createUser()
    const h = await newHabit(a)
    await expect(as(a)('update public.habits set user_id = $1 where id = $2', [b, h.id])).rejects.toThrow(/row-level security/)
  })

  it('B tidak dapat menempelkan penyelesaian ke habit milik A (user_id = B maupun = A)', async () => {
    const a = await createUser(); const b = await createUser()
    const h = await newHabit(a)
    await expect(as(b)(attackCompletion, [h.id, b])).rejects.toThrow(/foreign key/)
    await expect(as(b)(attackCompletion, [h.id, a])).rejects.toThrow(/row-level security/)
    expect(await countAll('habit_completions', 'habit_id = $1', [h.id])).toBe(0)
  })

  it('penyelesaian A tidak terlihat atau terhapus oleh B', async () => {
    const a = await createUser(); const b = await createUser()
    const h = await newHabit(a)
    await as(a)(insertCompletion, [h.id, a, 1])
    expect((await as(b)('select * from public.habit_completions')).rows).toHaveLength(0)
    expect((await as(b)('delete from public.habit_completions')).affectedRows).toBe(0)
    expect((await as(a)('select * from public.habit_completions')).rows).toHaveLength(1)
  })

  it('profil dan pengaturan A tidak dapat dibaca/diubah/dipalsukan oleh B', async () => {
    const a = await createUser('A'); const b = await createUser('B')
    expect((await as(b)<{ id: string }>('select id from public.profiles')).rows).toEqual([{ id: b }])
    expect((await as(b)(`update public.profiles set display_name = 'x' where id = $1`, [a])).affectedRows).toBe(0)
    expect((await as(b)(`update public.user_settings set theme = 'dark' where user_id = $1`, [a])).affectedRows).toBe(0)
    await db.query('delete from public.profiles where id = $1', [a]) // simulasikan pengguna lama tanpa profil
    await expect(as(b)(`insert into public.profiles (id) values ($1)`, [a])).rejects.toThrow(/row-level security/)
    expect(await countAll('profiles', 'id = $1', [a])).toBe(0)
    await db.query('delete from public.user_settings where user_id = $1', [a]) // simulasikan pengguna lama tanpa baris pengaturan
    await expect(as(b)(`insert into public.user_settings (user_id) values ($1)`, [a])).rejects.toThrow(/row-level security/)
    expect(await countAll('user_settings', 'user_id = $1', [a])).toBe(0)
  })

  it('tanpa sesi (auth.uid() null) tidak ada akses ke data apa pun', async () => {
    const a = await createUser(); await newHabit(a)
    expect((await as(null)('select * from public.habits')).rows).toHaveLength(0)
    await expect(as(null)(attackHabit, [a, 'x'])).rejects.toThrow(/row-level security/)
    expect(await countAll('habits', 'user_id = $1 and name = $2', [a, 'x'])).toBe(0)
  })

  it('role anon ditolak sepenuhnya', async () => {
    await expect(as(null, 'anon')('select * from public.habits')).rejects.toThrow(/permission denied/)
    await expect(as(null, 'anon')('select * from public.habit_completions')).rejects.toThrow(/permission denied/)
  })

  it('penyelesaian tidak dapat diubah (hanya dibuat/dihapus)', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await as(a)(insertCompletion, [h.id, a, 2])
    await expect(as(a)(`update public.habit_completions set completed_date = current_date - 3`)).rejects.toThrow(/permission denied/)
  })
})

describe('integritas data', () => {
  it('menolak penyelesaian ganda pada tanggal yang sama (unique)', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await as(a)(insertCompletion, [h.id, a, 1])
    await expect(as(a)(insertCompletion, [h.id, a, 1])).rejects.toMatchObject({ code: '23505' })
  })

  it('menghapus habit ikut menghapus penyelesaiannya; menghapus pengguna menghapus semuanya', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await as(a)(insertCompletion, [h.id, a, 1])
    await as(a)('delete from public.habits where id = $1', [h.id])
    expect((await db.query('select 1 from public.habit_completions where habit_id = $1', [h.id])).rows).toHaveLength(0)

    const h2 = await newHabit(a, 'lain')
    await as(a)(insertCompletion, [h2.id, a, 1])
    await db.query('delete from auth.users where id = $1', [a])
    for (const t of ['habits', 'habit_completions']) {
      expect((await db.query(`select 1 from public.${t} where user_id = $1`, [a])).rows).toHaveLength(0)
    }
    expect((await db.query('select 1 from public.profiles where id = $1', [a])).rows).toHaveLength(0)
  })

  it('constraint habit: nama, kategori, warna, jadwal', async () => {
    const a = await createUser()
    const bad = (sql: string, params: unknown[]) => expect(as(a)(sql, params)).rejects.toThrow(/violates check constraint/)
    await bad(insertHabit, [a, '   ', 'daily', '{}'])
    await bad(insertHabit, [a, 'x'.repeat(61), 'daily', '{}'])
    await bad(insertHabit, [a, 'ok', 'daily', '{1,2}']) // harian tidak boleh punya hari
    await bad(insertHabit, [a, 'ok', 'weekly_days', '{}']) // hari tertentu wajib punya hari
    await bad(insertHabit, [a, 'ok', 'weekly_days', '{7}']) // di luar 0–6
    await bad(insertHabit, [a, 'ok', 'mingguan', '{}']) // frekuensi tak dikenal
    await bad(`insert into public.habits (user_id,name,category,icon,color,frequency,start_date) values ($1,'ok','salah','Droplets','#3b82f6','daily',current_date)`, [a])
    await bad(`insert into public.habits (user_id,name,category,icon,color,frequency,start_date) values ($1,'ok','health','Droplets','merah','daily',current_date)`, [a])
    const ok = await as(a)<{ scheduled_days: number[] }>(insertHabit, [a, 'ok', 'weekly_days', '{1,3,5}'])
    expect(ok.rows[0]!.scheduled_days).toEqual([1, 3, 5])
  })

  it('menolak tanggal penyelesaian di masa depan, mengizinkan hari ini dan besok (zona waktu)', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await expect(as(a)(insertCompletion, [h.id, a, -2])).rejects.toThrow(/masa depan/)
    await expect(as(a)(insertCompletion, [h.id, a, -1])).resolves.toBeDefined()
    await expect(as(a)(insertCompletion, [h.id, a, 0])).resolves.toBeDefined()
  })

  it('batas mundur: 31 hari (UTC) masih diterima, 32 hari ditolak; penghapusan tidak dibatasi', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await expect(as(a)(insertCompletion, [h.id, a, 31])).resolves.toBeDefined()
    await expect(as(a)(insertCompletion, [h.id, a, 32])).rejects.toThrow(/terlalu lama/)
    await expect(as(a)(insertCompletion, [h.id, a, 400])).rejects.toThrow(/terlalu lama/)
    expect(await countAll('habit_completions', 'habit_id = $1', [h.id])).toBe(1)
    await as(a)('delete from public.habits where id = $1', [h.id]) // cascade tetap jalan
    expect(await countAll('habit_completions', 'habit_id = $1', [h.id])).toBe(0)
  })

  it('batas mundur juga berlaku saat tanggal penyelesaian diubah (superuser)', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await as(a)(insertCompletion, [h.id, a, 1])
    await expect(db.query(`update public.habit_completions set completed_date = current_date - 90 where habit_id = $1`, [h.id])).rejects.toThrow(/terlalu lama/)
  })

  it('pengaturan: zona waktu dan tema harus valid', async () => {
    const a = await createUser()
    await expect(as(a)(`update public.user_settings set timezone = 'Mars/Olympus'`)).rejects.toThrow(/Zona waktu tidak valid/)
    await expect(as(a)(`update public.user_settings set theme = 'tema-asing'`)).rejects.toThrow(/violates check constraint/)
    await as(a)(`update public.user_settings set timezone = 'Asia/Makassar', theme = 'dark'`)
    expect((await as(a)('select timezone, theme from public.user_settings')).rows).toEqual([{ timezone: 'Asia/Makassar', theme: 'dark' }])
  })

  it('semua zona waktu yang ditawarkan aplikasi diterima database', async () => {
    const a = await createUser()
    for (const { value } of TIMEZONE_OPTIONS) {
      await as(a)('update public.user_settings set timezone = $1', [value])
      expect((await as(a)<{ timezone: string }>('select timezone from public.user_settings')).rows).toEqual([{ timezone: value }])
    }
  })

  it('updated_at diperbarui otomatis saat habit diubah', async () => {
    const a = await createUser(); const h = await newHabit(a)
    await db.query(`update public.habits set updated_at = now() - interval '1 day', created_at = now() - interval '1 day' where id = $1`, [h.id])
    // trigger BEFORE UPDATE menimpa updated_at dengan now() walau diisi manual
    await as(a)(`update public.habits set name = 'Baru' where id = $1`, [h.id])
    const r = await db.query<{ fresh: boolean }>(`select updated_at > now() - interval '1 minute' as fresh from public.habits where id = $1`, [h.id])
    expect(r.rows[0]!.fresh).toBe(true)
  })
})

/**
 * Pada skema asli, policy SELECT juga ikut memeriksa baris hasil UPDATE sehingga `WITH CHECK` pada policy UPDATE
 * "tertutupi" dan pelonggarannya tidak terdeteksi tes lain. Di database terpisah ini policy SELECT sengaja dibuat
 * terbuka, sehingga satu-satunya yang bisa menahan pemindahan kepemilikan adalah `WITH CHECK` milik policy UPDATE.
 */
describe('WITH CHECK pada policy UPDATE berdiri sendiri (policy SELECT dilonggarkan)', () => {
  let iso: PGlite
  const asIso = (u: string | null) => asOn(iso, u)
  const mk = async (name: string) =>
    (await iso.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [
      `${crypto.randomUUID()}@contoh.id`, JSON.stringify({ display_name: name }),
    ])).rows[0]!.id

  beforeAll(async () => {
    iso = new PGlite()
    await iso.exec(supabaseAuthStub)
    await iso.exec(migration)
    for (const [table, policy] of [['habits', 'habits_select_own'], ['profiles', 'profiles_select_own'], ['user_settings', 'settings_select_own']] as const) {
      await iso.exec(`drop policy ${policy} on public.${table}; create policy ${policy}_relaxed on public.${table} for select to authenticated using (true);`)
    }
  })
  afterAll(async () => { await iso.close() })

  it('prasyarat: policy SELECT benar-benar longgar (B bisa membaca habit A) dan update sah tetap berjalan', async () => {
    const a = await mk('A'); const b = await mk('B')
    await asIso(a)(insertHabit, [a, 'Milik A', 'daily', '{}'])
    expect((await asIso(b)('select * from public.habits where user_id = $1', [a])).rows).toHaveLength(1)
    expect((await asIso(a)(`update public.habits set name = 'Diubah A' where user_id = $1`, [a])).affectedRows).toBe(1)
  })

  it('habits: A tidak dapat memindahkan habit ke B', async () => {
    const a = await mk('A'); const b = await mk('B')
    const h = (await asIso(a)<{ id: string }>(insertHabit, [a, 'Milik A', 'daily', '{}'])).rows[0]!
    await expect(asIso(a)('update public.habits set user_id = $1 where id = $2', [b, h.id])).rejects.toThrow(/row-level security/)
    expect((await iso.query('select 1 from public.habits where id = $1 and user_id = $2', [h.id, a])).rows).toHaveLength(1)
  })

  it('profiles: A tidak dapat mengambil alih profil B (baris B dihapus agar kunci utama tidak menutupi)', async () => {
    const a = await mk('A'); const b = await mk('B')
    await iso.query('delete from public.profiles where id = $1', [b])
    await expect(asIso(a)('update public.profiles set id = $1 where id = $2', [b, a])).rejects.toThrow(/row-level security/)
    expect((await iso.query('select 1 from public.profiles where id = $1', [a])).rows).toHaveLength(1)
  })

  it('user_settings: A tidak dapat memindahkan pengaturan ke B (baris B dihapus agar kunci utama tidak menutupi)', async () => {
    const a = await mk('A'); const b = await mk('B')
    await iso.query('delete from public.user_settings where user_id = $1', [b])
    await expect(asIso(a)('update public.user_settings set user_id = $1 where user_id = $2', [b, a])).rejects.toThrow(/row-level security/)
    expect((await iso.query('select 1 from public.user_settings where user_id = $1', [a])).rows).toHaveLength(1)
  })
})
