/** Zona waktu yang dapat dipilih. Daftar singkat agar mudah dipakai di HP; semuanya divalidasi database saat disimpan. */
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura (UTC+9)' },
  { value: 'Asia/Singapore', label: 'Singapura' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' },
  { value: 'Asia/Bangkok', label: 'Bangkok' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
] as const
