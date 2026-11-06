// Teks UI Bahasa Indonesia terpusat agar istilah konsisten.
export const id = {
  appName: 'Ritual',
  nav: {
    home: 'Beranda',
    habits: 'Kebiasaan Saya',
    calendar: 'Kalender',
    analytics: 'Statistik',
    settings: 'Pengaturan',
    profile: 'Profil',
    main: 'Navigasi utama',
    mobile: 'Navigasi bawah',
  },
  theme: {
    title: 'Tampilan',
    description: 'Pilih tema aplikasi.',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Ikuti sistem',
  },
  actions: {
    save: 'Simpan', cancel: 'Batal', edit: 'Ubah', delete: 'Hapus', retry: 'Coba Lagi',
    archive: 'Arsipkan', restore: 'Pulihkan', add: 'Tambah Kebiasaan',
    markComplete: 'Tandai Selesai', undoComplete: 'Batalkan', completed: 'Selesai',
  },
  categories: {
    health: 'Kesehatan', fitness: 'Olahraga', learning: 'Belajar', productivity: 'Produktivitas',
    finance: 'Keuangan', mindfulness: 'Mindfulness', other: 'Lainnya',
  },
  weekdaysShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  errors: { generic: 'Terjadi kesalahan. Silakan coba lagi.', loading: 'Memuat…' },
  common: {
    inProgress: 'Halaman ini sedang dikerjakan.',
    notFound: 'Halaman tidak ditemukan',
    backHome: 'Kembali ke beranda',
    skipToContent: 'Lewati ke konten utama',
  },
} as const
