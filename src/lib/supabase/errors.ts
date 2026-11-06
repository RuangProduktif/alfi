/** Pesan mentah dari server tidak ditampilkan ke pengguna; UI memakai pesan umum berbahasa Indonesia. */
export function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Permintaan gagal.')
}
