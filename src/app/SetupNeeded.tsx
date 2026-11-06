import { Card } from '@/components/ui/card'

/** Ditampilkan hanya bila variabel lingkungan Supabase belum diisi; tidak ada akun/data tanpa Supabase. */
export function SetupNeeded() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center p-4">
      <Card className="space-y-3">
        <h1 className="text-xl font-bold tracking-tight">Ritual belum terhubung ke Supabase</h1>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Salin <code>.env.example</code> menjadi <code>.env.local</code>.</li>
          <li>Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dari proyek Supabase kamu.</li>
          <li>Jalankan migration SQL di <code>supabase/migrations</code>.</li>
          <li>Mulai ulang server pengembangan.</li>
        </ol>
      </Card>
    </main>
  )
}
