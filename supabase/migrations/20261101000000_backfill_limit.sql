-- Batas mundur penyelesaian: penyelesaian hanya boleh dibuat untuk tanggal dalam 30 hari terakhir.
-- Aturan yang sama diterapkan di aplikasi (BACKFILL_DAYS = 30); database adalah pengaman utamanya.
--
-- Toleransi: server tidak tahu zona waktu pengguna saat insert, sedangkan "hari ini" pengguna bisa berbeda
-- hingga 1 hari dari tanggal UTC. Karena itu batas bawah di sini 31 hari terhadap tanggal UTC, sedangkan
-- aplikasi menegakkan 30 hari tepat menurut zona waktu pengguna.
--
-- Hanya INSERT/UPDATE tanggal yang diperiksa. Penghapusan (termasuk ON DELETE CASCADE saat habit atau
-- akun dihapus) tidak dibatasi.

create or replace function public.validate_completion_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  utc_today date := (now() at time zone 'UTC')::date;
begin
  if new.completed_date > utc_today + 1 then
    raise exception 'Tanggal penyelesaian tidak boleh di masa depan' using errcode = '22008';
  end if;
  if new.completed_date < utc_today - 31 then
    raise exception 'Tanggal penyelesaian terlalu lama (maksimal 30 hari ke belakang)' using errcode = '22008';
  end if;
  return new;
end;
$$;
