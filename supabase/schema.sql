-- Jalankan seluruh isi file ini di Supabase: SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

-- ROLES
do $$ begin create type public.app_role as enum ('admin'); exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

drop policy if exists "own roles" on public.user_roles;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- MASTER DATA
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.visit_purposes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.employees, public.visit_purposes to anon, authenticated;
grant insert, update, delete on public.employees, public.visit_purposes to authenticated;
grant all on public.employees, public.visit_purposes to service_role;
alter table public.employees enable row level security;
alter table public.visit_purposes enable row level security;

drop policy if exists "public read active" on public.employees;
create policy "public read active" on public.employees for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
drop policy if exists "admin write" on public.employees;
create policy "admin write" on public.employees for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "public read active" on public.visit_purposes;
create policy "public read active" on public.visit_purposes for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
drop policy if exists "admin write" on public.visit_purposes;
create policy "admin write" on public.visit_purposes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- GUESTS
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  institution text not null check (char_length(institution) between 2 and 150),
  phone text not null check (phone ~ '^[0-9+ -]{8,20}$'),
  employee_id uuid references public.employees(id) on delete set null,
  visit_purpose_id uuid references public.visit_purposes(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 500),
  check_in_time timestamptz not null default now(),
  form_opened_at timestamptz,
  fill_duration_seconds integer
);
grant select, insert, update, delete on public.guests to authenticated;
grant all on public.guests to service_role;
alter table public.guests enable row level security;
drop policy if exists "admin all" on public.guests;
create policy "admin all" on public.guests for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- DRAFTS (hanya lewat fungsi)
create table if not exists public.guest_drafts (
  draft_token uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
grant all on public.guest_drafts to service_role;
alter table public.guest_drafts enable row level security;

create or replace function public.upsert_draft(_token uuid, _payload jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if pg_column_size(_payload) > 8000 then raise exception 'payload too large'; end if;
  insert into guest_drafts(draft_token,payload,updated_at,expires_at) values(_token,_payload,t,t+interval '24 hours')
  on conflict (draft_token) do update set payload=excluded.payload, updated_at=t, expires_at=t+interval '24 hours';
  return t;
end $$;

create or replace function public.get_draft(_token uuid)
returns jsonb language sql security definer set search_path = public as $$
  select payload from guest_drafts where draft_token=_token and expires_at > now()
$$;

create or replace function public.delete_draft(_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from guest_drafts where draft_token=_token
$$;

create or replace function public.submit_guest(_payload jsonb, _token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; opened timestamptz;
begin
  if not exists (select 1 from employees where id=(_payload->>'employee_id')::uuid and is_active) then
    raise exception 'Karyawan tidak valid'; end if;
  if not exists (select 1 from visit_purposes where id=(_payload->>'visit_purpose_id')::uuid and is_active) then
    raise exception 'Tujuan tidak valid'; end if;
  opened := nullif(_payload->>'form_opened_at','')::timestamptz;
  insert into guests(name,institution,phone,employee_id,visit_purpose_id,notes,form_opened_at,fill_duration_seconds)
  values (trim(_payload->>'name'), trim(_payload->>'institution'), trim(_payload->>'phone'),
    (_payload->>'employee_id')::uuid, (_payload->>'visit_purpose_id')::uuid,
    nullif(trim(coalesce(_payload->>'notes','')),''), opened,
    case
      when _payload->>'fill_duration_seconds' is not null and (_payload->>'fill_duration_seconds')::int > 0
        then least(360, greatest(10, (_payload->>'fill_duration_seconds')::int))
      when opened is not null
        then least(360, greatest(10, extract(epoch from now()-opened)::int))
    end)
  returning id into new_id;
  if _token is not null then delete from guest_drafts where draft_token=_token; end if;
  return new_id;
end $$;

grant execute on function public.upsert_draft(uuid,jsonb), public.get_draft(uuid), public.delete_draft(uuid), public.submit_guest(jsonb,uuid) to anon, authenticated;

-- DATA CONTOH
insert into public.visit_purposes(name) select x from unnest(array['Meeting','Interview','Pengiriman Dokumen','Kunjungan Bisnis','Lainnya']) x
where not exists (select 1 from public.visit_purposes);
insert into public.employees(name,department) select * from (values ('Budi Santoso','HRD'),('Siti Rahma','Keuangan'),('Andi Wijaya','IT'),('Dewi Lestari','Marketing')) v(n,d)
where not exists (select 1 from public.employees);

-- PROFIL & ADMIN OTOMATIS
-- Cara pakai:
--   1) Daftarkan email admin:  insert into public.admin_emails(email) values ('admin@contoh.com');
--   2) Buat user di Authentication -> Users (Add user / invite).
--      Profil otomatis dibuat, dan jika emailnya ada di admin_emails, user langsung jadi admin.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table if not exists public.admin_emails (
  email text primary key
);
grant all on public.admin_emails to service_role;
alter table public.admin_emails enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  if exists (select 1 from public.admin_emails where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Mengisi profil untuk user yang sudah dibuat sebelum trigger ini ada
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
-- Mengangkat admin untuk user lama yang emailnya sudah terdaftar di admin_emails
insert into public.user_roles (user_id, role)
select u.id, 'admin' from auth.users u
where exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email))
on conflict (user_id, role) do nothing;

-- PEMBATASAN PERCOBAAN LOGIN (maks 5 gagal per 15 menit per email, kunci 15 menit)
create table if not exists public.login_attempts (
  id bigserial primary key,
  email text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_time on public.login_attempts(lower(email), created_at desc);
grant all on public.login_attempts to service_role;
alter table public.login_attempts enable row level security;

create or replace function public.login_lock_seconds(_email text)
returns integer language sql stable security definer set search_path = public as $$
  select case when count(*) >= 5
    then greatest(0, extract(epoch from (max(created_at) + interval '15 minutes' - now()))::int) else 0 end
  from login_attempts
  where lower(email) = lower(_email) and not success and created_at > now() - interval '15 minutes'
    and created_at > coalesce((select max(created_at) from login_attempts where lower(email)=lower(_email) and success), '-infinity')
$$;

create or replace function public.record_login_attempt(_email text, _success boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if char_length(_email) > 255 then return; end if;
  insert into login_attempts(email, success) values (lower(trim(_email)), _success);
  delete from login_attempts where created_at < now() - interval '7 days';
end $$;

grant execute on function public.login_lock_seconds(text), public.record_login_attempt(text, boolean) to anon, authenticated;

-- ============================================================
-- NOTIFIKASI KARYAWAN & KUNJUNGAN TERJADWAL
-- Karyawan login dengan email yang sama dengan email di data Karyawan.
-- ============================================================
alter table public.employees add column if not exists email text;
alter table public.employees add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists employees_email_uniq on public.employees(lower(email)) where email is not null;
alter table public.guests add column if not exists scheduled_at timestamptz;
alter table public.guests add column if not exists is_important boolean not null default false;

-- hubungkan karyawan dengan akun login berdasarkan email
create or replace function public.link_employee_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null then new.user_id := null;
  else new.user_id := (select id from auth.users where lower(email)=lower(new.email) limit 1);
  end if;
  return new;
end $$;
drop trigger if exists employees_link_user on public.employees;
create trigger employees_link_user before insert or update of email on public.employees
for each row execute function public.link_employee_user();

create or replace function public.link_user_employee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.employees set user_id = new.id where lower(email)=lower(new.email);
  return new;
end $$;
drop trigger if exists on_auth_user_link_employee on auth.users;
create trigger on_auth_user_link_employee after insert on auth.users
for each row execute function public.link_user_employee();
update public.employees e set user_id = u.id from auth.users u where e.email is not null and lower(u.email)=lower(e.email);

-- karyawan boleh melihat tamu yang menuju dirinya
drop policy if exists "employee read own guests" on public.guests;
create policy "employee read own guests" on public.guests for select to authenticated
using (employee_id in (select id from public.employees where user_id = auth.uid()));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_emp on public.notifications(employee_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
drop policy if exists "own notif read" on public.notifications;
create policy "own notif read" on public.notifications for select to authenticated
using (employee_id in (select id from public.employees where user_id = auth.uid()) or public.has_role(auth.uid(),'admin'));
drop policy if exists "own notif update" on public.notifications;
create policy "own notif update" on public.notifications for update to authenticated
using (employee_id in (select id from public.employees where user_id = auth.uid()))
with check (employee_id in (select id from public.employees where user_id = auth.uid()));

create or replace function public.notify_new_guest()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.employee_id is null then return new; end if;
  insert into notifications(employee_id, guest_id, kind, title, body) values (
    new.employee_id, new.id,
    case when new.scheduled_at is not null then 'scheduled' else 'new_guest' end,
    case when new.scheduled_at is not null then
      (case when new.is_important then '⭐ Kunjungan penting dijadwalkan: ' else 'Kunjungan dijadwalkan: ' end) || new.name
    else 'Tamu baru tiba: ' || new.name end,
    new.institution || coalesce(' · ' || to_char(new.scheduled_at at time zone 'Asia/Jakarta','DD Mon YYYY HH24:MI') || ' WIB','')
  );
  return new;
end $$;
drop trigger if exists guests_notify on public.guests;
create trigger guests_notify after insert on public.guests for each row execute function public.notify_new_guest();

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- submit_guest versi baru: mendukung jadwal & tanda penting
create or replace function public.submit_guest(_payload jsonb, _token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; opened timestamptz; sched timestamptz;
begin
  if not exists (select 1 from employees where id=(_payload->>'employee_id')::uuid and is_active) then
    raise exception 'Karyawan tidak valid'; end if;
  if not exists (select 1 from visit_purposes where id=(_payload->>'visit_purpose_id')::uuid and is_active) then
    raise exception 'Tujuan tidak valid'; end if;
  opened := nullif(_payload->>'form_opened_at','')::timestamptz;
  sched := nullif(_payload->>'scheduled_at','')::timestamptz;
  if sched is not null and (sched < now() - interval '5 minutes' or sched > now() + interval '180 days') then
    raise exception 'Jadwal tidak valid'; end if;
  insert into guests(name,institution,phone,employee_id,visit_purpose_id,notes,form_opened_at,fill_duration_seconds,scheduled_at,is_important)
  values (trim(_payload->>'name'), trim(_payload->>'institution'), trim(_payload->>'phone'),
    (_payload->>'employee_id')::uuid, (_payload->>'visit_purpose_id')::uuid,
    nullif(trim(coalesce(_payload->>'notes','')),''), opened,
    case when opened is not null then greatest(0, extract(epoch from now()-opened))::int end,
    sched, coalesce((_payload->>'is_important')::boolean, false))
  returning id into new_id;
  if _token is not null then delete from guest_drafts where draft_token=_token; end if;
  return new_id;
end $$;

-- ============================================================
-- KELOLA EMAIL ADMIN DARI APLIKASI
-- ============================================================
alter table public.admin_emails add column if not exists created_at timestamptz not null default now();
grant select, insert, delete on public.admin_emails to authenticated;
drop policy if exists "admin manage admin_emails" on public.admin_emails;
create policy "admin manage admin_emails" on public.admin_emails for all to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.sync_admin_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into user_roles(user_id, role) select id, 'admin' from auth.users where lower(email)=lower(new.email)
    on conflict (user_id, role) do nothing;
    return new;
  else
    delete from user_roles where role='admin' and user_id <> auth.uid()
      and user_id in (select id from auth.users where lower(email)=lower(old.email));
    return old;
  end if;
end $$;
drop trigger if exists admin_emails_sync on public.admin_emails;
create trigger admin_emails_sync after insert or delete on public.admin_emails
for each row execute function public.sync_admin_email();

-- ============================================================
-- PENGINGAT KUNJUNGAN PENTING (30 menit sebelum & tepat waktu)
-- ============================================================
create unique index if not exists notifications_guest_kind_uniq on public.notifications(guest_id, kind) where guest_id is not null;

create or replace function public.generate_visit_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; c integer;
begin
  insert into notifications(employee_id, guest_id, kind, title, body)
  select g.employee_id, g.id, 'reminder_30', '⏰ 30 menit lagi: kunjungan penting ' || g.name,
         g.institution || ' · ' || to_char(g.scheduled_at at time zone 'Asia/Jakarta','HH24:MI') || ' WIB'
  from guests g
  where g.is_important and g.employee_id is not null
    and g.scheduled_at > now() and g.scheduled_at <= now() + interval '30 minutes'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;
  insert into notifications(employee_id, guest_id, kind, title, body)
  select g.employee_id, g.id, 'reminder_now', '🔔 Sekarang: ' || g.name || ' dijadwalkan tiba',
         g.institution || ' · ' || to_char(g.scheduled_at at time zone 'Asia/Jakarta','HH24:MI') || ' WIB'
  from guests g
  where g.is_important and g.employee_id is not null
    and g.scheduled_at <= now() and g.scheduled_at > now() - interval '2 hours'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;
  return n;
end $$;
grant execute on function public.generate_visit_reminders() to authenticated;

-- Jalankan otomatis tiap menit bila pg_cron aktif (Database -> Extensions -> pg_cron)
do $$ begin
  perform cron.schedule('nobu-visit-reminders', '* * * * *', 'select public.generate_visit_reminders()');
exception when others then raise notice 'pg_cron belum aktif; pengingat tetap dibuat saat portal karyawan terbuka';
end $$;

-- Daftar pengguna + role untuk halaman admin (role tetap di user_roles)
create or replace function public.list_users_with_roles()
returns table (id uuid, email text, full_name text, roles text[], is_employee boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name,
      coalesce(array_agg(r.role::text order by r.role) filter (where r.role is not null), '{}'),
      exists (select 1 from public.employees e where e.user_id = p.id),
      p.created_at
    from public.profiles p
    left join public.user_roles r on r.user_id = p.id
    group by p.id order by p.created_at desc;
end $$;
revoke all on function public.list_users_with_roles() from public, anon;
grant execute on function public.list_users_with_roles() to authenticated;
