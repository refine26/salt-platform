-- SALT demo data: 12 talent, 4 brands, 6 jobs, submissions, 1 booking + contract.
-- Every demo login uses the password  SaltDemo2026!
-- Safe to re-run: it deletes previous demo data (emails ending @saltdemo.com) first.

-- ───────── 0. Clean out earlier demo data ─────────
delete from companies where name like '%(Demo)';
delete from auth.users where email like '%@saltdemo.com';

-- ───────── 1. A few ZIP codes so radius search works in the demo ─────────
insert into zip_codes (zip, city, state, lat, lng) values
  ('92101','San Diego','CA',32.7190,-117.1627), ('92024','Encinitas','CA',33.0459,-117.2612),
  ('92127','San Diego','CA',33.0220,-117.1180), ('90012','Los Angeles','CA',34.0614,-118.2385),
  ('90401','Santa Monica','CA',34.0141,-118.4935), ('92660','Newport Beach','CA',33.6189,-117.8755),
  ('64108','Kansas City','MO',39.0839,-94.5843), ('66210','Overland Park','KS',38.9282,-94.7130),
  ('85004','Phoenix','AZ',33.4515,-112.0682), ('78701','Austin','TX',30.2709,-97.7426),
  ('33131','Miami','FL',25.7663,-80.1917), ('10001','New York','NY',40.7506,-73.9971)
on conflict (zip) do nothing;

-- ───────── 2. Helper: create a confirmed login ─────────
create or replace function pg_temp.demo_user(p_email text) returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', p_email,
    extensions.crypt('SaltDemo2026!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now());
  return uid;
end $$;

-- ───────── 3. Talent ─────────
do $$
declare r record; uid uuid;
begin
  for r in select * from (values
    ('jordan.rivera','Jordan Rivera','Soccer','Midfielder','NCAA D1','University of San Diego','San Diego','CA','92101',2001,'Male',array['Hispanic / Latino'],71,170,10.5,'Brown','short','Brown',array['print','commercial','social'],array['Ball juggling','Bilingual Spanish','Sprinting'],1200,'Former D1 midfielder, fitness and lifestyle model',false),
    ('maya.okafor','Maya Okafor','Track & Field','100m / 200m','NCAA D1','UCLA','Los Angeles','CA','90012',2003,'Female',array['Black / African American'],67,128,8.0,'Black','long','Brown',array['print','commercial'],array['Block starts','Hurdles','Activewear'],1500,'Current UCLA sprinter, hero runner for footwear spots',true),
    ('tyler.brooks','Tyler Brooks','Basketball','Guard','Professional','G League','Phoenix','AZ','85004',1998,'Male',array['Black / African American','White'],77,205,13.0,'Black','buzz','Hazel',array['commercial','appearance','social'],array['Dunking','Ball handling','Public speaking'],2500,'Pro guard, 6''5", 120K Instagram followers',false),
    ('sofia.lindqvist','Sofia Lindqvist','Swimming','Freestyle','Olympic','Team USA Trials','Austin','TX','78701',1999,'Female',array['White'],70,145,9.0,'Blonde','long','Blue',array['print','commercial'],array['Underwater','Open water','Swimwear'],2200,'Olympic Trials finalist, underwater and swimwear specialist',false),
    ('kenji.watanabe','Kenji Watanabe','Volleyball','Outside hitter','NCAA D1','Pepperdine','Santa Monica','CA','90401',2002,'Male',array['Asian'],75,185,12.0,'Black','medium','Brown',array['print','social'],array['Beach volleyball','Surfing','Japanese'],900,'Beach and indoor volleyball, surf lifestyle',true),
    ('ava.chen','Ava Chen','Tennis','Singles','NCAA D1','University of Miami','Miami','FL','33131',2004,'Female',array['Asian'],65,120,7.5,'Black','long','Brown',array['social','print'],array['UGC creator','Pilates','Mandarin'],800,'Tennis player and lifestyle content creator',true),
    ('marcus.bell','Marcus Bell','Football','Wide receiver','Professional','Former NFL practice squad','Kansas City','MO','64108',1996,'Male',array['Black / African American'],73,195,11.5,'Black','buzz','Brown',array['commercial','appearance'],array['Route running','Hosting','Youth clinics'],3000,'Former NFL receiver, on-camera host and clinic coach',false),
    ('lena.morales','Lena Morales','Soccer','Forward','Professional','NWSL','Encinitas','CA','92024',1997,'Female',array['Hispanic / Latino'],66,135,8.5,'Brown','long','Green',array['commercial','print','appearance'],array['Freestyle tricks','Bilingual Spanish','Yoga'],2800,'NWSL forward, freestyle ball skills on cue',false),
    ('noah.james','Noah James','Baseball','Shortstop','NAIA','Park University','Overland Park','KS','66210',2002,'Male',array['White'],72,180,11.0,'Blonde','short','Blue',array['print','social'],array['Fielding','Batting','Outdoor gear'],600,'NAIA shortstop, outdoor and gear shoots',true),
    ('amara.diallo','Amara Diallo','Track & Field','Long jump','NCAA D2','Cal State San Marcos','San Diego','CA','92127',2001,'Female',array['Black / African American'],69,140,9.5,'Black','short','Brown',array['print','commercial','social'],array['Plyometrics','French','Dance'],1000,'Long jumper with dance background',false),
    ('ryan.oconnor','Ryan O''Connor','CrossFit','Individual','Club / Amateur','CrossFit Games qualifier','Newport Beach','CA','92660',1995,'Male',array['White'],70,190,10.0,'Red','medium','Green',array['commercial','social'],array['Olympic lifting','Gymnastics','Nutrition coaching'],1400,'CrossFit Games qualifier, gym and supplement campaigns',false),
    ('priya.nair','Priya Nair','Gymnastics','All-around','NCAA D1','Oklahoma','New York','NY','10001',2003,'Female',array['South Asian'],62,110,6.5,'Black','long','Brown',array['print','commercial'],array['Flexibility','Handstands','Acrobatics'],1300,'NCAA gymnast, acrobatic and flexibility shots',true)
  ) as t(handle,name,sport,pos,lvl,school,city,st,zip,yr,gender,eth,ht,wt,shoe,hair,hairlen,eyes,gigs,skills,rate,headline,ncaa)
  loop
    uid := pg_temp.demo_user(r.handle || '@saltdemo.com');
    insert into accounts (id, role, email, full_name, status)
      values (uid, 'talent', r.handle || '@saltdemo.com', r.name, 'approved');
    insert into talent_profiles (id, slug, display_name, headline, bio, city, state, zip, travel_radius_mi,
      sport, position, level, school, birth_year, gender, ethnicity, height_in, weight_lb, shoe_size,
      hair_color, hair_length, eye_color, sizes, gig_types, skills, day_rate,
      is_ncaa_active, ncaa_ack_at)
    values (uid, replace(r.handle, '.', '-'), r.name, r.headline,
      r.name || ' competes at the ' || r.lvl || ' level in ' || r.sport || '. Comfortable on set, takes direction well, and can perform sport skills on cue for photo and video.',
      r.city, r.st, r.zip, 100, r.sport, r.pos, r.lvl, r.school, r.yr, r.gender, r.eth, r.ht, r.wt, r.shoe,
      r.hair, r.hairlen, r.eyes, jsonb_build_object('shirt', case when r.ht > 72 then 'L' else 'M' end),
      r.gigs::gig_type[], r.skills, r.rate, r.ncaa, case when r.ncaa then now() end);
  end loop;

  -- Two talent accounts left pending so the admin approval queue has something in it
  for r in select * from (values ('sam.patel','Sam Patel','Lacrosse'), ('chloe.martin','Chloe Martin','Softball'))
    as p(handle, name, sport)
  loop
    uid := pg_temp.demo_user(r.handle || '@saltdemo.com');
    insert into accounts (id, role, email, full_name, status) values (uid, 'talent', r.handle || '@saltdemo.com', r.name, 'pending');
    insert into talent_profiles (id, slug, display_name, sport, level, city, state)
      values (uid, replace(r.handle, '.', '-'), r.name, r.sport, 'NCAA D1', 'San Diego', 'CA');
  end loop;
end $$;

-- ───────── 4. Brands (clients) and jobs ─────────
do $$
declare r record; uid uuid; cid uuid; did uuid;
begin
  for r in select * from (values
    ('client.apex','Alex Morgan','Apex Athletics (Demo)','Athletic apparel','approved'),
    ('client.coastline','Dana Reyes','Coastline Hydration (Demo)','Sports drinks','approved'),
    ('client.stride','Chris Patel','Stride Running Co. (Demo)','Footwear','approved'),
    ('client.heartland','Morgan Lee','Heartland Fitness Studios (Demo)','Gyms and fitness','pending')
  ) as b(handle, person, company, industry, status)
  loop
    uid := pg_temp.demo_user(r.handle || '@saltdemo.com');
    insert into accounts (id, role, email, full_name, status) values (uid, 'client', r.handle || '@saltdemo.com', r.person, r.status::approval_status);
    insert into companies (name, website, industry, status, verified_at)
      values (r.company, 'https://example.com', r.industry, r.status::approval_status, case when r.status = 'approved' then now() end)
      returning id into cid;
    insert into divisions (company_id, name) values (cid, 'Brand Marketing') returning id into did;
    insert into company_members (company_id, account_id, division_id, member_role) values (cid, uid, did, 'owner');
  end loop;
end $$;

insert into jobs (company_id, created_by, title, description, gig_type, sports, city, state,
  shoot_start, shoot_end, rate_usd, usage_terms, openings, ncaa_eligible, status)
select c.id, m.account_id, j.title, j.descr, j.gig::gig_type, j.sports, j.city, j.st,
  current_date + j.days, current_date + j.days + j.len, j.rate, j.usage, j.openings, j.ncaa, j.status::job_status
from (values
  ('Apex Athletics (Demo)','Soccer players for spring cleats campaign','Looking for 2 current or former soccer players, ages 18 to 30, any ethnicity. Must dribble and shoot on camera. Half day print, half day video.','commercial',array['Soccer'],'San Diego','CA',21,0,1500,'Digital, social and in-store, US only, 12 months.',2,true,'open'),
  ('Apex Athletics (Demo)','Training apparel lookbook','Female and male athletes, 5''6" to 6''2", athletic build. Studio shoot, 8 looks per talent.','print',array['Track & Field','CrossFit','Soccer'],'Los Angeles','CA',30,1,1200,'E-commerce and lookbook, 2 years.',4,true,'open'),
  ('Coastline Hydration (Demo)','Beach volleyball hydration spot','Two beach athletes for a 30-second spot. Must be comfortable in swimwear and playing in sand.','commercial',array['Volleyball','Swimming'],'Santa Monica','CA',14,0,2500,'TV, streaming and social, North America, 12 months.',2,false,'open'),
  ('Coastline Hydration (Demo)','Creator partnership: summer training series','Athletes with engaged audiences to film 3 short training clips featuring the product.','social',array[]::text[],'Remote','',10,30,800,'Organic and paid social, 6 months.',5,true,'open'),
  ('Stride Running Co. (Demo)','Sprinter for hero shoe launch','Hero runner for launch film. Block starts and full-speed passes on a track. Ages 20 to 30.','commercial',array['Track & Field'],'San Diego','CA',35,1,3500,'Global, all media, 2 years.',1,true,'open'),
  ('Stride Running Co. (Demo)','Store opening appearance','Local athlete for a 2-hour store opening, meet-and-greet and short run club.','appearance',array[]::text[],'Kansas City','MO',45,0,750,'Event photos for social, 12 months.',1,true,'pending_review')
) as j(company, title, descr, gig, sports, city, st, days, len, rate, usage, openings, ncaa, status)
join companies c on c.name = j.company
join company_members m on m.company_id = c.id;

-- ───────── 5. Submissions, a booking and a contract ─────────
insert into applications (job_id, talent_id, status, cover_note)
select j.id, t.id, a.status::app_status, a.note
from (values
  ('Soccer players for spring cleats campaign','jordan-rivera','shortlisted','Four-year D1 starter. I can hit the ball-mastery and finishing shots in one take.'),
  ('Soccer players for spring cleats campaign','lena-morales','booked','NWSL forward. Happy to do freestyle tricks for the social cutdowns.'),
  ('Soccer players for spring cleats campaign','noah-james','applied','Played soccer through high school before baseball. Available all week.'),
  ('Sprinter for hero shoe launch','maya-okafor','applied','Current UCLA 100m/200m sprinter. I will clear this with our compliance office.'),
  ('Sprinter for hero shoe launch','amara-diallo','shortlisted','Long jumper with strong acceleration and dance background for movement shots.'),
  ('Beach volleyball hydration spot','kenji-watanabe','applied','Beach volleyball every weekend in Santa Monica.'),
  ('Training apparel lookbook','ryan-oconnor','applied','Comfortable with studio work and quick changes.'),
  ('Creator partnership: summer training series','ava-chen','applied','I post training content 4x a week to about 40K followers.')
) as a(job, slug, status, note)
join jobs j on j.title = a.job
join talent_profiles t on t.slug = a.slug;

with b as (
  insert into bookings (application_id, job_id, talent_id, company_id, rate_usd, shoot_date, call_time, location)
  select a.id, j.id, a.talent_id, j.company_id, 1800, j.shoot_start, '7:00 AM', 'Torero Stadium, San Diego, CA'
  from applications a join jobs j on j.id = a.job_id
  where a.status = 'booked'
  returning id, shoot_date, location, rate_usd
)
insert into contracts (booking_id, title, body, client_signed_at, client_signature)
select b.id, 'Talent Agreement: Soccer players for spring cleats campaign',
'TALENT SERVICES AGREEMENT

Client: Apex Athletics (Demo)
Talent: Lena Morales
Project: Soccer players for spring cleats campaign
Shoot date: ' || b.shoot_date || '   Call time: 7:00 AM
Location: ' || b.location || '
Fee: $' || b.rate_usd || ' USD, paid within 30 days of the shoot.

1. Services. Talent will appear in the project above and follow reasonable direction from Client''s production team.
2. Usage. Digital, social and in-store, US only, 12 months from first use.
3. Release. Talent grants Client the right to use Talent''s name, image and likeness solely as described in Section 2.
4. Independent contractor. Talent is not an employee of Client or SALT and is responsible for their own taxes.
5. Cancellation. If Client cancels within 48 hours of the shoot, Client pays 50% of the fee.

This agreement is facilitated by SALT (Sports and Active Lifestyle Talent). Signed electronically by both parties.',
now(), 'Alex Morgan'
from b;

-- ───────── 6. Check ─────────
select 'talent' as kind, count(*) from accounts where role = 'talent' and email like '%@saltdemo.com'
union all select 'clients', count(*) from accounts where role = 'client' and email like '%@saltdemo.com'
union all select 'jobs', count(*) from jobs j join companies c on c.id = j.company_id where c.name like '%(Demo)'
union all select 'submissions', count(*) from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id where c.name like '%(Demo)';
