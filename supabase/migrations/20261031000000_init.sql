-- Ritual: skema awal.
-- Prinsip: database adalah pengaman utama. Frontend hanya lapisan kenyamanan.

-- ---------------------------------------------------------------------------
-- Fungsi bantu
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 1 baris per pengguna (data tampilan)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default ''
                 constraint profiles_display_name_len check (char_length(display_name) <= 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_settings: preferensi per pengguna
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  theme      text not null default 'system'
               constraint user_settings_theme_valid check (theme in ('light', 'dark', 'system')),
  timezone   text not null default 'Asia/Jakarta',
  locale     text not null default 'id-ID'
               constraint user_settings_locale_valid check (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Zona waktu harus dikenali Postgres (CHECK tidak boleh membaca katalog, jadi pakai trigger).
create or replace function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  begin
    perform now() at time zone new.timezone;
  exception when others then
    raise exception 'Zona waktu tidak valid: %', new.timezone using errcode = '22023';
  end;
  return new;
end;
$$;

create trigger user_settings_validate_timezone
  before insert or update of timezone on public.user_settings
  for each row execute function public.validate_timezone();

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------

create table public.habits (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null
                   constraint habits_name_len check (char_length(btrim(name)) between 1 and 60),
  description    text
                   constraint habits_description_len check (description is null or char_length(description) <= 200),
  category       text not null
                   constraint habits_category_valid check (category in
                     ('health', 'fitness', 'learning', 'productivity', 'finance', 'mindfulness', 'other')),
  icon           text not null
                   constraint habits_icon_format check (icon ~ '^[A-Za-z0-9]{1,40}$'),
  color          text not null
                   constraint habits_color_format check (color ~ '^#[0-9a-fA-F]{6}$'),
  frequency      text not null
                   constraint habits_frequency_valid check (frequency in ('daily', 'weekly_days')),
  -- 0 = Minggu ... 6 = Sabtu. Kosong untuk 'daily'; 1–7 hari untuk 'weekly_days'.
  scheduled_days smallint[] not null default '{}',
  start_date     date not null,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint habits_schedule_consistent check (
    (frequency = 'daily' and cardinality(scheduled_days) = 0)
    or (frequency = 'weekly_days'
        and cardinality(scheduled_days) between 1 and 7
        and scheduled_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
  ),
  -- Target FK komposit dari habit_completions: memastikan penyelesaian selalu milik pemilik habit.
  constraint habits_id_user_unique unique (id, user_id)
);

create index habits_user_idx on public.habits (user_id, archived_at);

-- ---------------------------------------------------------------------------
-- habit_completions
-- ---------------------------------------------------------------------------

create table public.habit_completions (
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null,
  user_id        uuid not null,
  -- Tanggal kalender pada zona waktu pengguna (bukan hasil konversi UTC).
  completed_date date not null,
  completed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),

  -- FK komposit: (habit_id, user_id) harus cocok dengan pasangan di habits.
  -- Pemeriksaan FK berjalan tanpa RLS, sehingga pengguna tidak bisa menempelkan
  -- penyelesaian ke habit milik orang lain.
  constraint habit_completions_habit_owner_fk
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  -- Satu penyelesaian per habit per tanggal.
  constraint habit_completions_one_per_day unique (habit_id, completed_date)
);

create index habit_completions_user_date_idx on public.habit_completions (user_id, completed_date);

-- Tanggal masa depan ditolak. Toleransi +1 hari karena zona waktu terjauh (UTC+14) bisa
-- sudah berada di "besok" menurut UTC.
create or replace function public.validate_completion_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completed_date > ((now() at time zone 'UTC')::date + 1) then
    raise exception 'Tanggal penyelesaian tidak boleh di masa depan' using errcode = '22008';
  end if;
  return new;
end;
$$;

create trigger habit_completions_validate_date
  before insert or update of completed_date on public.habit_completions
  for each row execute function public.validate_completion_date();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
create trigger habits_set_updated_at        before update on public.habits        for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pengguna baru -> profil + pengaturan otomatis
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Hak akses + Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.user_settings, public.habits, public.habit_completions from anon, public;
grant usage on schema public to authenticated;
grant select, insert, update         on public.profiles          to authenticated;
grant select, insert, update         on public.user_settings     to authenticated;
grant select, insert, update, delete on public.habits            to authenticated;
-- Penyelesaian tidak pernah diubah; hanya dibuat atau dihapus.
grant select, insert, delete         on public.habit_completions to authenticated;

alter table public.profiles          enable row level security;
alter table public.user_settings     enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_completions enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_settings
create policy settings_select_own on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy settings_insert_own on public.user_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy settings_update_own on public.user_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- habits
create policy habits_select_own on public.habits for select to authenticated using (user_id = (select auth.uid()));
create policy habits_insert_own on public.habits for insert to authenticated with check (user_id = (select auth.uid()));
create policy habits_update_own on public.habits for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy habits_delete_own on public.habits for delete to authenticated using (user_id = (select auth.uid()));

-- habit_completions
create policy completions_select_own on public.habit_completions for select to authenticated using (user_id = (select auth.uid()));
create policy completions_insert_own on public.habit_completions for insert to authenticated with check (user_id = (select auth.uid()));
create policy completions_delete_own on public.habit_completions for delete to authenticated using (user_id = (select auth.uid()));
