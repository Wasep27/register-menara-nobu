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
    case when opened is not null then greatest(0, extract(epoch from now()-opened))::int end)
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

-- JADIKAN ADMIN (setelah membuat user di Authentication -> Users), ganti emailnya:
-- insert into public.user_roles(user_id, role) select id, 'admin' from auth.users where email = 'admin@contoh.com';
