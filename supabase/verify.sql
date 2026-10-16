-- =====================================================================
-- Cek kesiapan Supabase sebelum deploy — Buku Tamu Digital Menara Nobu
-- Jalankan di Supabase → SQL Editor. Hanya MEMBACA, tidak mengubah data.
-- Hasil: satu tabel daftar cek dengan status OK / KURANG / PERINGATAN.
-- =====================================================================
with
req_tables(name) as (values
  ('employees'),('visit_purposes'),('guests'),('guest_drafts'),('user_roles'),
  ('profiles'),('admin_emails'),('login_attempts'),('notifications')),
req_functions(name) as (values
  ('has_role'),('upsert_draft'),('get_draft'),('delete_draft'),('submit_guest'),
  ('login_lock_seconds'),('record_login_attempt'),('handle_new_user'),
  ('sync_admin_email'),('link_employee_user'),('link_user_employee'),
  ('notify_new_guest'),('generate_visit_reminders')),
req_columns(tbl, col) as (values
  ('guests','scheduled_at'),('guests','is_important'),('guests','fill_duration_seconds'),
  ('employees','email'),('employees','user_id'),('admin_emails','created_at')),
checks as (
  select 1 as urut, 'Tabel' as kategori, t.name as item,
    case when to_regclass('public.' || t.name) is not null then 'OK' else 'KURANG' end as status,
    'Jalankan supabase/schema.sql' as saran
  from req_tables t
  union all
  select 2, 'RLS aktif', t.name,
    case when c.relrowsecurity then 'OK' else 'KURANG' end,
    'Row Level Security harus aktif'
  from req_tables t join pg_class c on c.oid = to_regclass('public.' || t.name)
  union all
  select 3, 'Kolom', c.tbl || '.' || c.col,
    case when exists (select 1 from information_schema.columns
      where table_schema='public' and table_name=c.tbl and column_name=c.col) then 'OK' else 'KURANG' end,
    'Jalankan ulang supabase/schema.sql versi terbaru'
  from req_columns c
  union all
  select 4, 'Fungsi', f.name,
    case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=f.name) then 'OK' else 'KURANG' end,
    'Jalankan supabase/schema.sql'
  from req_functions f
  union all
  select 5, 'Trigger', x.name,
    case when exists (select 1 from pg_trigger where tgname = x.name and not tgisinternal) then 'OK' else 'KURANG' end,
    'Trigger otomatis belum terpasang'
  from (values ('on_auth_user_created'),('on_auth_user_link_employee'),('employees_link_user'),('guests_notify'),('admin_emails_sync')) x(name)
  union all
  select 5, 'Trigger', 'trigger pada auth.users (profil & admin otomatis)',
    case when exists (select 1 from pg_trigger tg join pg_class c on c.oid=tg.tgrelid
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='auth' and c.relname='users' and not tg.tgisinternal) then 'OK' else 'KURANG' end,
    'Profil & peran admin tidak dibuat otomatis'
  union all
  select 6, 'Akses tamu (anon)', 'execute submit_guest',
    case when to_regprocedure('public.submit_guest(jsonb,uuid)') is null then 'KURANG'
      when has_function_privilege('anon', to_regprocedure('public.submit_guest(jsonb,uuid)'), 'execute') then 'OK' else 'KURANG' end,
    'Tamu tidak bisa mengirim formulir'
  union all
  select 7, 'Realtime', 'notifications di supabase_realtime',
    case when exists (select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then 'OK' else 'PERINGATAN' end,
    'Notifikasi tidak muncul langsung tanpa refresh'
  union all
  select 8, 'Pengingat', 'ekstensi pg_cron',
    case when exists (select 1 from pg_extension where extname='pg_cron') then 'OK' else 'PERINGATAN' end,
    'Aktifkan di Database → Extensions → pg_cron, lalu jalankan ulang schema.sql'
  union all
  select 9, 'Data', 'admin terdaftar (admin_emails)',
    case when to_regclass('public.admin_emails') is null then 'KURANG'
      when exists (select 1 from public.admin_emails) then 'OK' else 'PERINGATAN' end,
    'Tambahkan minimal satu email admin'
  union all
  select 9, 'Data', 'karyawan aktif',
    case when to_regclass('public.employees') is null then 'KURANG'
      when exists (select 1 from public.employees where is_active) then 'OK' else 'PERINGATAN' end,
    'Tamu tidak bisa memilih karyawan'
  union all
  select 9, 'Data', 'tujuan kunjungan aktif',
    case when to_regclass('public.visit_purposes') is null then 'KURANG'
      when exists (select 1 from public.visit_purposes where is_active) then 'OK' else 'PERINGATAN' end,
    'Tamu tidak bisa memilih tujuan'
)
select kategori, item, status, case when status='OK' then '' else saran end as saran
from checks
order by case status when 'KURANG' then 0 when 'PERINGATAN' then 1 else 2 end, urut, item;

-- Cek jadwal pengingat (jalankan terpisah bila pg_cron aktif):
-- select jobname, schedule, active from cron.job where jobname = 'nobu-visit-reminders';
