import type { SupabaseClient } from '@supabase/supabase-js'

export type Resp = { data?: unknown; error?: { message: string; code?: string } | null }

/** Klien tiruan: setiap metode berantai mengembalikan dirinya; `await` mengambil respons berikutnya dari antrean. */
export function fakeClient(queue: Resp[]) {
  const calls: [string, unknown[]][] = []
  const chain: unknown = new Proxy({}, {
    get(_, prop) {
      if (prop === 'then') { const r = queue.shift() ?? { data: null, error: null }; return (res: (v: Resp) => void) => res({ error: null, ...r }) }
      return (...args: unknown[]) => { calls.push([String(prop), args]); return chain }
    },
  })
  return { client: { from: (t: string) => { calls.push(['from', [t]]); return chain } } as unknown as SupabaseClient, calls }
}
