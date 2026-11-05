create or replace function is_approved(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = uid and status = 'approved');
$$;

drop policy if exists tal_read on talent_profiles;
create policy tal_read on talent_profiles for select using (
  (is_public and is_approved(id)) or id = auth.uid() or is_admin());

alter function search_talent(text, text, gig_type, text[], text, int, int, int, int, numeric, numeric,
  text, text, text, text, int, int, double precision, double precision, int, int, int) security definer;
alter function search_talent(text, text, gig_type, text[], text, int, int, int, int, numeric, numeric,
  text, text, text, text, int, int, double precision, double precision, int, int, int) set search_path = public, extensions;

select count(*) as athletes_visible_to_public from search_talent();
