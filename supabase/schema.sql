-- S.A.L.T. (Sports and Active Lifestyle Talent) — database schema
-- Supabase / Postgres. Sized for 60K+ talent profiles and 60K+ videos.
-- Run once in the Supabase SQL editor.

create extension if not exists pg_trgm;
create extension if not exists cube;
create extension if not exists earthdistance;   -- radius search

create type user_role       as enum ('talent', 'client', 'admin');
create type approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type gig_type        as enum ('print', 'commercial', 'social', 'appearance');
create type media_kind      as enum ('photo', 'video');
create type media_status    as enum ('uploading', 'processing', 'ready', 'errored', 'removed');
create type job_status      as enum ('draft', 'pending_review', 'open', 'closed', 'rejected');
create type app_status      as enum ('applied', 'shortlisted', 'booked', 'declined', 'withdrawn');
create type booking_status  as enum ('confirmed', 'completed', 'cancelled');

-- ───────────────────────── Accounts ─────────────────────────
-- One row per login. Role is set at registration; approval gate for talent + clients.
create table accounts (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  email       text not null,
  full_name   text not null,
  status      approval_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index accounts_role_status_idx on accounts (role, status, created_at desc);

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from accounts where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

-- US ZIP centroids for radius search (load once; see README)
create table zip_codes (zip text primary key, city text, state text, lat double precision not null, lng double precision not null);

-- Immutable wrapper so skills can be part of the generated search column
create or replace function salt_join(arr text[]) returns text language sql immutable parallel safe as $$
  select coalesce(array_to_string(arr, ' '), '');
$$;

-- ───────────────────────── Talent ─────────────────────────
create table talent_profiles (
  id              uuid primary key references accounts(id) on delete cascade,
  slug            text unique not null,
  display_name    text not null,
  headline        text,
  bio             text,
  -- location
  city            text,
  state           text,
  zip             text,
  lat             double precision,   -- from ZIP geocode, for radius search
  lng             double precision,
  travel_radius_mi integer default 50,
  -- athletics
  sport           text,
  position        text,
  level           text,              -- NCAA D1, D2, D3, NAIA, Pro, Olympic, Club
  school          text,
  -- demographics & appearance (self-reported, optional, used for casting filters)
  birth_year      integer,
  gender          text,
  ethnicity       text[] default '{}',  -- self-identified, multi-select, optional
  height_in       integer,
  weight_lb       integer,
  shoe_size       numeric(4,1),         -- US size
  hair_color      text,
  hair_length     text,                 -- bald | buzz | short | medium | long
  eye_color       text,
  sizes           jsonb default '{}',   -- {"shirt":"M","pant":"32x32","dress":"6"}
  -- work
  gig_types       gig_type[] default '{}',
  skills          text[] default '{}',
  day_rate        integer,
  has_agent       boolean default false,
  -- NCAA compliance (current college athletes)
  is_ncaa_active  boolean not null default false,
  ncaa_school_compliance_email text,
  ncaa_ack_at     timestamptz,          -- athlete acknowledged NIL disclosure duty
  -- media
  headshot_path   text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search_text     text generated always as (
    coalesce(display_name,'') || ' ' || coalesce(sport,'') || ' ' || coalesce(position,'') || ' ' ||
    coalesce(school,'') || ' ' || coalesce(city,'') || ' ' || coalesce(level,'') || ' ' ||
    salt_join(skills)
  ) stored
);
create index talent_browse_idx  on talent_profiles (is_public, created_at desc);
create index talent_sport_idx   on talent_profiles (sport);
create index talent_loc_idx     on talent_profiles (state, city);
create index talent_gigs_idx    on talent_profiles using gin (gig_types);
create index talent_height_idx  on talent_profiles (height_in);
create index talent_weight_idx  on talent_profiles (weight_lb);
create index talent_shoe_idx    on talent_profiles (shoe_size);
create index talent_age_idx     on talent_profiles (birth_year);
create index talent_look_idx    on talent_profiles (hair_color, eye_color, hair_length);
create index talent_eth_idx     on talent_profiles using gin (ethnicity);
create index talent_skills_idx  on talent_profiles using gin (skills);
create index talent_geo_idx     on talent_profiles using gist (ll_to_earth(lat, lng)) where lat is not null;
create index talent_search_idx  on talent_profiles using gin (search_text gin_trgm_ops);

-- Photos (Supabase Storage) and videos (Mux). Media is moderated by admins.
create table media (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references talent_profiles(id) on delete cascade,
  kind             media_kind not null,
  title            text,
  status           media_status not null default 'uploading',
  storage_path     text,              -- photos
  mux_upload_id    text unique,       -- videos
  mux_asset_id     text unique,
  mux_playback_id  text,
  duration_seconds numeric,
  flagged          boolean not null default false,
  sort_order       integer default 0,
  created_at       timestamptz not null default now()
);
create index media_owner_idx on media (owner_id, kind, sort_order);
create index media_flagged_idx on media (flagged) where flagged;

-- Fill lat/lng from ZIP automatically
create or replace function talent_geocode() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    select lat, lng into new.lat, new.lng from zip_codes where zip = left(new.zip, 5);
  elsif new.zip is distinct from old.zip then
    select lat, lng into new.lat, new.lng from zip_codes where zip = left(new.zip, 5);
  end if;
  return new;
end $$;
create trigger talent_geo before insert or update on talent_profiles for each row execute function talent_geocode();

-- Per-talent limits keep storage costs predictable at 60K users
create or replace function enforce_media_limit() returns trigger language plpgsql as $$
declare cap int := case when new.kind = 'video' then 5 else 20 end;
begin
  if (select count(*) from media where owner_id = new.owner_id and kind = new.kind and status <> 'removed') >= cap then
    raise exception 'Limit reached: % % per profile', cap, new.kind;
  end if;
  return new;
end $$;
create trigger media_limit before insert on media for each row execute function enforce_media_limit();

-- ───────────────────────── Clients ─────────────────────────
-- A company with divisions; multiple users per company.
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  website     text,
  industry    text,
  status      approval_status not null default 'pending',   -- client verification
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create table divisions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null
);
create table company_members (
  company_id  uuid not null references companies(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  member_role text not null default 'member',   -- owner | manager | member
  primary key (company_id, account_id)
);
create index company_members_account_idx on company_members (account_id);

create or replace function is_company_member(c uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from company_members where company_id = c and account_id = auth.uid());
$$;

-- ───────────────────────── Jobs, applications, bookings ─────────────────────────
create table jobs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  division_id  uuid references divisions(id) on delete set null,
  created_by   uuid not null references accounts(id),
  title        text not null,
  description  text not null,
  gig_type     gig_type not null,
  sports       text[] default '{}',
  city         text,
  state        text,
  shoot_start  date,
  shoot_end    date,
  rate_usd     integer,
  usage_terms  text,                       -- where/how long the content runs
  openings     integer not null default 1,
  ncaa_eligible boolean not null default true,
  status       job_status not null default 'pending_review',  -- admin approval required
  reviewed_by  uuid references accounts(id),
  review_note  text,
  created_at   timestamptz not null default now()
);
create index jobs_open_idx on jobs (status, created_at desc);
create index jobs_company_idx on jobs (company_id, created_at desc);
create index jobs_loc_idx on jobs (state, city);

create table applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs(id) on delete cascade,
  talent_id   uuid not null references talent_profiles(id) on delete cascade,
  status      app_status not null default 'applied',
  cover_note  text,
  self_tape_id uuid references media(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (job_id, talent_id)
);
create index applications_job_idx on applications (job_id, status);
create index applications_talent_idx on applications (talent_id, created_at desc);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid unique not null references applications(id) on delete cascade,
  job_id         uuid not null references jobs(id) on delete cascade,
  talent_id      uuid not null references talent_profiles(id) on delete cascade,
  company_id     uuid not null references companies(id) on delete cascade,
  rate_usd       integer,
  shoot_date     date,
  call_time      text,
  location       text,
  status         booking_status not null default 'confirmed',
  ncaa_disclosed_at timestamptz,   -- set when a current NCAA athlete reports the deal to their school
  created_at     timestamptz not null default now()
);
create index bookings_talent_idx on bookings (talent_id, shoot_date);
create index bookings_company_idx on bookings (company_id, shoot_date);

-- Contracts: generated when a talent is booked; both sides view and sign
create table contracts (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid unique not null references bookings(id) on delete cascade,
  title         text not null,
  body          text not null,          -- rendered agreement text (rate, dates, usage, release)
  talent_signed_at timestamptz,
  talent_signature text,
  client_signed_at timestamptz,
  client_signature text,
  created_at    timestamptz not null default now()
);

-- Talent search with every casting filter + radius. Called from /talent.
create or replace function search_talent(
  q text default null, sport_f text default null, gig_f gig_type default null,
  ethnicity_f text[] default null, gender_f text default null,
  min_height int default null, max_height int default null,
  min_weight int default null, max_weight int default null,
  min_shoe numeric default null, max_shoe numeric default null,
  hair_color_f text default null, hair_length_f text default null, eye_color_f text default null,
  skill_f text default null, min_age int default null, max_age int default null,
  near_lat double precision default null, near_lng double precision default null, radius_mi int default null,
  page_size int default 24, page_offset int default 0
) returns table (
  slug text, display_name text, sport text, level text, city text, state text,
  height_in int, day_rate int, headshot_path text, miles numeric, total bigint
) language sql stable security definer set search_path = public, extensions as $$
  with yr as (select extract(year from now())::int y),
  f as (
    select t.*, case when near_lat is not null and t.lat is not null
      then (earth_distance(ll_to_earth(near_lat, near_lng), ll_to_earth(t.lat, t.lng)) / 1609.34)::numeric end as dist
    from talent_profiles t
    join accounts a on a.id = t.id and a.status = 'approved'
    where t.is_public
      and (q is null or t.search_text ilike '%' || q || '%')
      and (sport_f is null or t.sport = sport_f)
      and (gig_f is null or gig_f = any(t.gig_types))
      and (ethnicity_f is null or t.ethnicity && ethnicity_f)
      and (gender_f is null or t.gender = gender_f)
      and (min_height is null or t.height_in >= min_height)
      and (max_height is null or t.height_in <= max_height)
      and (min_weight is null or t.weight_lb >= min_weight)
      and (max_weight is null or t.weight_lb <= max_weight)
      and (min_shoe is null or t.shoe_size >= min_shoe)
      and (max_shoe is null or t.shoe_size <= max_shoe)
      and (hair_color_f is null or t.hair_color = hair_color_f)
      and (hair_length_f is null or t.hair_length = hair_length_f)
      and (eye_color_f is null or t.eye_color = eye_color_f)
      and (skill_f is null or exists (select 1 from unnest(t.skills) s where s ilike '%' || skill_f || '%'))
      and (min_age is null or t.birth_year <= (select y from yr) - min_age)
      and (max_age is null or t.birth_year >= (select y from yr) - max_age)
      and (radius_mi is null or near_lat is null or
           earth_box(ll_to_earth(near_lat, near_lng), radius_mi * 1609.34) @> ll_to_earth(t.lat, t.lng))
  )
  select slug, display_name, sport, level, city, state, height_in, day_rate, headshot_path,
         round(dist, 1), count(*) over ()
  from f
  where radius_mi is null or dist is null or dist <= radius_mi
  order by dist nulls last, created_at desc
  limit page_size offset page_offset;
$$;

-- Audit trail for admin actions
create table admin_actions (
  id         bigint generated always as identity primary key,
  admin_id   uuid not null references accounts(id),
  target     text not null,     -- 'account:<id>', 'job:<id>', 'media:<id>', 'company:<id>'
  action     text not null,     -- approve | reject | suspend | remove
  note       text,
  created_at timestamptz not null default now()
);

-- Platform settings editable by admins
create table settings (key text primary key, value jsonb not null);
insert into settings values
  ('max_video_seconds', '180'), ('max_videos', '5'), ('max_photos', '20'),
  ('require_talent_approval', 'true'), ('require_job_approval', 'true');

-- ───────────────────────── Row Level Security ─────────────────────────
alter table accounts         enable row level security;
alter table talent_profiles  enable row level security;
alter table media            enable row level security;
alter table companies        enable row level security;
alter table divisions        enable row level security;
alter table company_members  enable row level security;
alter table jobs             enable row level security;
alter table applications     enable row level security;
alter table bookings         enable row level security;
alter table admin_actions    enable row level security;
alter table contracts        enable row level security;
alter table settings         enable row level security;
alter table zip_codes        enable row level security;
create policy zip_read on zip_codes for select using (true);

-- accounts: self + admins. Role/status changes only through admin or server code.
create policy acc_self   on accounts for select using (id = auth.uid() or is_admin());
create policy acc_insert on accounts for insert with check (id = auth.uid() and role <> 'admin' and status = 'pending');
create policy acc_admin  on accounts for update using (is_admin());

-- talent: approved public profiles visible to everyone; owner + admin always
create or replace function is_approved(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = uid and status = 'approved');
$$;
create policy tal_read on talent_profiles for select using (
  (is_public and is_approved(id)) or id = auth.uid() or is_admin());
create policy tal_ins on talent_profiles for insert with check (id = auth.uid());
create policy tal_upd on talent_profiles for update using (id = auth.uid() or is_admin());

-- media: ready + unflagged is public; owner + admin always. Writes via server.
create policy med_read on media for select using ((status = 'ready' and not flagged) or owner_id = auth.uid() or is_admin());
create policy med_del  on media for delete using (owner_id = auth.uid() or is_admin());
create policy med_adm  on media for update using (is_admin());

-- companies / divisions / members
create policy co_read on companies for select using (status = 'approved' or is_company_member(id) or is_admin());
create policy co_upd  on companies for update using (is_company_member(id) or is_admin());
create policy div_read on divisions for select using (is_company_member(company_id) or is_admin());
create policy div_write on divisions for all using (is_company_member(company_id)) with check (is_company_member(company_id));
create policy mem_read on company_members for select using (is_company_member(company_id) or is_admin());

-- jobs: open jobs visible to all; company members see their own drafts/pending
create policy job_read on jobs for select using (status = 'open' or is_company_member(company_id) or is_admin());
create policy job_ins on jobs for insert with check (
  is_company_member(company_id) and created_by = auth.uid()
  and status in ('draft','pending_review')
  and exists (select 1 from companies c where c.id = company_id and c.status = 'approved'));
create policy job_upd on jobs for update using (is_company_member(company_id) or is_admin());

-- applications: talent sees own; company sees applicants to its jobs
create policy app_read on applications for select using (
  talent_id = auth.uid() or is_admin()
  or exists (select 1 from jobs j where j.id = job_id and is_company_member(j.company_id)));
create policy app_ins on applications for insert with check (
  talent_id = auth.uid()
  and exists (select 1 from accounts a where a.id = auth.uid() and a.status = 'approved')
  and exists (select 1 from jobs j where j.id = job_id and j.status = 'open'));
create policy app_upd on applications for update using (
  talent_id = auth.uid()
  or exists (select 1 from jobs j where j.id = job_id and is_company_member(j.company_id)));

-- bookings
create policy bk_read on bookings for select using (talent_id = auth.uid() or is_company_member(company_id) or is_admin());
create policy bk_ins  on bookings for insert with check (is_company_member(company_id));
create policy bk_upd  on bookings for update using (talent_id = auth.uid() or is_company_member(company_id) or is_admin());

create policy ct_read on contracts for select using (
  is_admin() or exists (select 1 from bookings b where b.id = booking_id and (b.talent_id = auth.uid() or is_company_member(b.company_id))));
create policy ct_ins on contracts for insert with check (
  exists (select 1 from bookings b where b.id = booking_id and is_company_member(b.company_id)));
create policy ct_sign on contracts for update using (
  exists (select 1 from bookings b where b.id = booking_id and (b.talent_id = auth.uid() or is_company_member(b.company_id))));

create policy aa_admin on admin_actions for all using (is_admin()) with check (is_admin());
create policy set_read on settings for select using (true);
create policy set_admin on settings for update using (is_admin());

-- ───────────────────────── Storage (photos) ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict do nothing;
create policy photo_owner_write on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photo_owner_delete on storage.objects for delete
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
