/**
 * Backend Supabase TIRUAN untuk uji browser. Bukan Supabase sungguhan:
 * tidak ada RLS, trigger, FK, atau Postgres. Hanya meniru bentuk respons Auth (GoTrue)
 * dan PostgREST yang dipakai aplikasi, supaya UI sungguhan bisa dirender dan diklik di Chromium.
 * Keamanan data (RLS) dibuktikan oleh supabase/tests/rls.test.ts (PGlite), bukan oleh berkas ini.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { BrowserContext } from '@playwright/test'

/** Origin yang dibangun ke dalam aplikasi (lihat e2e/serve.mjs). Berbeda port dari aplikasi (4173) sehingga lintas-origin seperti Supabase asli. */
export const MOCK_PORT = 4174
export const MOCK_ORIGIN = `http://127.0.0.1:${MOCK_PORT}`

/** Bentuk minimal `Route` Playwright yang dipakai handler; dipenuhi juga oleh server HTTP sungguhan (mode PWA). */
interface RouteLike {
  request(): { method(): string; url(): string; headers(): Record<string, string>; postData(): string | null }
  fulfill(o: { status: number; headers?: Record<string, string>; body?: string }): Promise<void>
}
class NodeRoute implements RouteLike {
  private req: IncomingMessage
  private res: ServerResponse
  private body: string
  constructor(req: IncomingMessage, res: ServerResponse, body: string) { this.req = req; this.res = res; this.body = body }
  request() {
    return { method: () => this.req.method ?? 'GET', url: () => `${MOCK_ORIGIN}${this.req.url ?? '/'}`, headers: () => this.req.headers as Record<string, string>, postData: () => (this.body ? this.body : null) }
  }
  fulfill(o: { status: number; headers?: Record<string, string>; body?: string }) { this.res.writeHead(o.status, o.headers); this.res.end(o.body ?? ''); return Promise.resolve() }
}

export interface MockUser { id: string; email: string; password: string; displayName: string }
interface Row { [k: string]: unknown }

export interface MockOptions {
  /** true: signUp tidak mengembalikan sesi (perlu verifikasi email). */
  requireEmailConfirmation?: boolean
  /** Mengembalikan status HTTP untuk memaksa galat; null = normal. */
  failRest?: (req: { method: string; table: string }) => number | null
  /** Penundaan respons REST (ms) untuk menguji status memuat / cegah submit ganda. */
  restDelayMs?: number
}

let counter = 0
const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

export class MockSupabase {
  users: MockUser[] = []
  habits: Row[] = []
  completions: Row[] = []
  settings: Row[] = []
  requests: { method: string; url: string }[] = []
  externalBlocked: string[] = []
  /** Galat internal mock sendiri (bug di berkas ini, bukan di aplikasi). Tes seharusnya memastikan kosong. */
  mockErrors: string[] = []
  opts: MockOptions

  constructor(opts: MockOptions = {}) { this.opts = opts }

  addUser(email: string, password: string, displayName = 'Uji Coba'): MockUser {
    const u = { id: uuid(), email, password, displayName }
    this.users.push(u)
    this.settings.push({ user_id: u.id, theme: 'system', timezone: 'Asia/Jakarta', locale: 'id-ID', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    return u
  }

  addHabit(userId: string, h: Partial<Row> & { name: string }): Row {
    const now = new Date().toISOString()
    const row: Row = {
      id: uuid(), user_id: userId, description: null, category: 'health', icon: 'Droplets', color: '#3b82f6', frequency: 'daily',
      scheduled_days: [], start_date: '2026-10-01', archived_at: null, created_at: now, updated_at: now, ...h,
    }
    this.habits.push(row)
    return row
  }

  addCompletion(userId: string, habitId: string, date: string): void {
    this.completions.push({ id: uuid(), habit_id: habitId, user_id: userId, completed_date: date, completed_at: new Date().toISOString(), created_at: new Date().toISOString() })
  }

  private session(u: MockUser) {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const user = { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { display_name: u.displayName }, app_metadata: {}, created_at: new Date().toISOString() }
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, exp, role: 'authenticated' })}.mock`
    return { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: `r-${u.id}`, user }
  }

  private userFromAuth(route: RouteLike): MockUser | undefined {
    const auth = route.request().headers()['authorization'] ?? ''
    const token = auth.replace(/^Bearer\s+/i, '')
    const sub = token.split('.')[1] ? (JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as { sub?: string }).sub : undefined
    return this.users.find((u) => u.id === sub)
  }

  private server: Server | null = null

  /**
   * Mode PWA: service worker mengirim permintaan lintas-origin sendiri sehingga `context.route` tidak melihatnya.
   * Di mode ini mock berjalan sebagai server HTTP sungguhan di MOCK_PORT dan hanya permintaan luar lain yang diblokir.
   */
  async serve(context: BrowserContext): Promise<void> {
    await this.blockExternal(context)
    await this.listen()
  }

  /** Mulai (atau mulai ulang setelah `close()`) server HTTP mock. Data di memori tetap. */
  async listen(): Promise<void> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', (c: Buffer) => chunks.push(c))
      req.on('end', () => {
        const route = new NodeRoute(req, res, Buffer.concat(chunks).toString())
        this.dispatch(route).catch(() => {})
      })
    })
    await new Promise<void>((resolve) => this.server!.listen(MOCK_PORT, '127.0.0.1', resolve))
  }

  async close(): Promise<void> {
    const srv = this.server
    this.server = null
    if (srv) { srv.closeAllConnections(); await new Promise<void>((r) => srv.close(() => r())) }
  }

  private async dispatch(r: RouteLike) {
    try { await this.handle(r) } catch (e) {
      this.mockErrors.push(`${r.request().method()} ${r.request().url()}: ${String(e)}`)
      await r.fulfill({ status: 500, headers: { ...this.cors, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'mock error' }) })
    }
  }

  private async blockExternal(context: BrowserContext): Promise<void> {
    await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1).*/, (r) => { this.externalBlocked.push(r.request().url()); return r.abort() })
  }

  async install(context: BrowserContext): Promise<void> {
    // Semua permintaan keluar selain localhost ditolak dan dicatat (uji: tidak ada kebocoran ke jaringan nyata).
    await this.blockExternal(context)
    await context.route(`${MOCK_ORIGIN}/**`, async (r) => {
      try { await this.handle(r) } catch (e) {
        this.mockErrors.push(`${r.request().method()} ${r.request().url()}: ${String(e)}`)
        await r.fulfill({ status: 500, headers: { ...this.cors, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'mock error' }) }).catch(() => {})
      }
    })
  }

  private cors = {
    'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
    'access-control-expose-headers': '*',
  }
  private json(route: RouteLike, status: number, body: unknown) {
    return route.fulfill({ status, headers: { ...this.cors, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) })
  }

  private async handle(route: RouteLike) {
    const req = route.request()
    const url = new URL(req.url())
    this.requests.push({ method: req.method(), url: req.url() })
    // Preflight: `*` tidak mencakup header Authorization pada CORS, jadi pantulkan header yang diminta (seperti Supabase asli yang mendaftarkannya eksplisit).
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...this.cors, 'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*', 'access-control-max-age': '600' } })
    if (url.pathname.startsWith('/auth/v1/')) return this.auth(route, url)
    if (url.pathname.startsWith('/rest/v1/')) return this.rest(route, url)
    return this.json(route, 404, { message: 'not found' })
  }

  private async auth(route: RouteLike, url: URL) {
    const req = route.request()
    const path = url.pathname.replace('/auth/v1', '')
    const body = (req.postData() ? JSON.parse(req.postData()!) : {}) as Row
    if (path === '/token' && url.searchParams.get('grant_type') === 'password') {
      const u = this.users.find((x) => x.email === body.email && x.password === body.password)
      if (!u) return this.json(route, 400, { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials', message: 'Invalid login credentials' })
      return this.json(route, 200, this.session(u))
    }
    if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const u = this.users.find((x) => `r-${x.id}` === body.refresh_token)
      return u ? this.json(route, 200, this.session(u)) : this.json(route, 400, { code: 'refresh_token_not_found', message: 'Invalid Refresh Token' })
    }
    if (path === '/signup') {
      const email = body.email as string
      if (this.users.some((x) => x.email === email)) return this.json(route, 422, { code: 'user_already_exists', error_code: 'user_already_exists', msg: 'User already registered' })
      const meta = (body.data ?? {}) as { display_name?: string }
      const u = this.addUser(email, body.password as string, meta.display_name ?? '')
      const s = this.session(u)
      // GoTrue sungguhan menyertakan `identities` (kosong hanya untuk email yang sudah terdaftar) dan waktu pengiriman konfirmasi.
      const confirmUser = { ...s.user, identities: [{ identity_id: uuid(), id: u.id, user_id: u.id, provider: 'email' }], confirmation_sent_at: new Date().toISOString() }
      return this.json(route, 200, this.opts.requireEmailConfirmation ? confirmUser : s)
    }
    if (path === '/logout') return route.fulfill({ status: 204, headers: this.cors })
    if (path === '/recover') return this.json(route, 200, {})
    if (path === '/user' && req.method() === 'GET') {
      const u = this.userFromAuth(route)
      return u ? this.json(route, 200, this.session(u).user) : this.json(route, 401, { code: 'session_not_found', message: 'no session' })
    }
    if (path === '/user' && req.method() === 'PUT') {
      const u = this.userFromAuth(route)
      if (!u) return this.json(route, 401, { code: 'session_not_found', message: 'no session' })
      u.password = body.password as string
      return this.json(route, 200, this.session(u).user)
    }
    return this.json(route, 404, { message: `auth ${path} not mocked` })
  }

  private async rest(route: RouteLike, url: URL) {
    const req = route.request()
    const table = url.pathname.replace('/rest/v1/', '')
    const method = req.method()
    if (this.opts.restDelayMs) await new Promise((r) => setTimeout(r, this.opts.restDelayMs))
    const forced = this.opts.failRest?.({ method, table })
    if (forced) return this.json(route, forced, { code: 'XX000', message: 'forced failure' })

    const user = this.userFromAuth(route)
    if (!user) return this.json(route, 401, { code: '42501', message: 'no session' })
    const store = ({ habits: this.habits, habit_completions: this.completions, user_settings: this.settings } as Record<string, Row[]>)[table]
    if (!store) return this.json(route, 404, { code: '42P01', message: `${table} not mocked` })

    // "RLS" tiruan hanya untuk kenyamanan uji: hanya baris milik pengguna yang terlihat.
    const own = (r: Row) => r.user_id === user.id
    const filters = [...url.searchParams.entries()].filter(([k]) => !['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k))
    const match = (r: Row) => own(r) && filters.every(([k, v]) => { const [op, ...rest] = v.split('.'); return op === 'eq' ? String(r[k]) === rest.join('.') : true })
    const wantsObject = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const respond = (rows: Row[], status = 200) => {
      if (wantsObject) {
        if (rows.length !== 1) return this.json(route, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
        return this.json(route, status, rows[0])
      }
      return this.json(route, status, rows)
    }

    if (method === 'GET') {
      let rows = store.filter(match)
      for (const o of url.searchParams.getAll('order')) {
        const [col, dir] = o.split('.')
        rows = [...rows].sort((a, b) => String(a[col!]).localeCompare(String(b[col!])) * (dir === 'desc' ? -1 : 1))
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = url.searchParams.get('limit')
      rows = rows.slice(offset, limit ? offset + Number(limit) : undefined)
      return respond(rows)
    }
    if (method === 'POST') {
      const body = JSON.parse(req.postData() ?? '{}') as Row
      if (!own(body)) return this.json(route, 403, { code: '42501', message: 'new row violates row-level security policy' })
      const now = new Date().toISOString()
      if (table === 'habit_completions') {
        if (store.some((r) => r.habit_id === body.habit_id && r.completed_date === body.completed_date)) return this.json(route, 409, { code: '23505', message: 'duplicate key value violates unique constraint' })
        const row = { id: uuid(), completed_at: now, created_at: now, ...body }
        store.push(row)
        return respond([row], 201)
      }
      if (table === 'user_settings') {
        if (store.some((r) => r.user_id === body.user_id)) return this.json(route, 409, { code: '23505', message: 'duplicate key' })
        const row = { theme: 'system', timezone: 'Asia/Jakarta', locale: 'id-ID', created_at: now, updated_at: now, ...body }
        store.push(row)
        return respond([row], 201)
      }
      const row = { id: uuid(), description: null, archived_at: null, created_at: now, updated_at: now, ...body }
      store.push(row)
      return respond([row], 201)
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(req.postData() ?? '{}') as Row
      const rows = store.filter(match)
      rows.forEach((r) => Object.assign(r, patch, { updated_at: new Date().toISOString() }))
      return respond(rows)
    }
    if (method === 'DELETE') {
      const gone = store.filter(match)
      for (const g of gone) store.splice(store.indexOf(g), 1)
      if (table === 'habits') for (const g of gone) this.completions = this.completions.filter((c) => c.habit_id !== g.id) // ON DELETE CASCADE tiruan
      return route.fulfill({ status: 204, headers: this.cors })
    }
    return this.json(route, 405, { message: 'method not mocked' })
  }
}
