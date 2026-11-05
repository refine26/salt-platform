-- SALT demo talent, part 2: active lifestyle talent across all life stages (all 18+).
-- Password for every demo login: SaltDemo2026!   Safe to re-run.

delete from auth.users where email in (
 'grace.thompson@saltdemo.com','daniel.kim@saltdemo.com','rosa.delgado@saltdemo.com','malik.johnson@saltdemo.com',
 'hannah.brooks@saltdemo.com','tom.reilly@saltdemo.com','leilani.kahale@saltdemo.com','andre.silva@saltdemo.com',
 'mei.lin@saltdemo.com','jasmine.carter@saltdemo.com','ethan.walker@saltdemo.com','robert.hayes@saltdemo.com');

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

do $$
declare r record; uid uuid;
begin
  for r in select * from (values
    ('grace.thompson','Grace Thompson','Pickleball','Doubles','Everyday active','Encinitas Pickleball Club','Encinitas','CA','92024',1959,'Female',array['White'],65,135,8.0,'Gray','medium','Blue',array['print','commercial','social'],array['Pickleball','Walking','Gardening'],600,'Retired teacher, plays pickleball five days a week','Retired teacher who picked up pickleball at 60 and now plays five days a week. Natural on camera, great with lifestyle, wellness and active-aging campaigns.'),
    ('daniel.kim','Daniel Kim','Trail Running','Ultra marathon','Everyday active','Kansas City Trail Nerds','Overland Park','KS','66210',1984,'Male',array['Asian'],69,160,10.0,'Black','short','Brown',array['print','commercial','social'],array['Trail running','Camping','Dad of two'],800,'Software engineer and dad who runs ultras on weekends','Engineer by day, ultrarunner on weekends. Comfortable in outdoor, family and gear shoots, and can run take after take on trail.'),
    ('rosa.delgado','Rosa Delgado','Yoga','Vinyasa instructor','Fitness professional','RYT-500 certified','Austin','TX','78701',1991,'Female',array['Hispanic / Latino'],64,125,7.0,'Black','long','Brown',array['print','commercial','social','appearance'],array['Yoga','Breathwork','Bilingual Spanish'],900,'Yoga instructor and studio owner, 12 years teaching','RYT-500 yoga teacher and studio owner. Holds poses cleanly for stills and can lead on-camera flows for wellness and apparel brands.'),
    ('malik.johnson','Malik Johnson','Wheelchair Basketball','Guard','Adaptive / Para','NWBA Division I','Phoenix','AZ','85004',1997,'Male',array['Black / African American'],72,175,11.0,'Black','buzz','Brown',array['commercial','appearance','social'],array['Wheelchair basketball','Public speaking','Hand cycling'],1500,'Wheelchair basketball guard and motivational speaker','NWBA guard and speaker. Brings real athletic action to adaptive-sport and inclusive campaigns, and is experienced hosting clinics and events.'),
    ('hannah.brooks','Hannah Brooks','Pilates','Reformer instructor','Fitness professional','Certified Pilates instructor','Santa Monica','CA','90401',1995,'Female',array['White'],66,130,8.5,'Brown','long','Green',array['print','social'],array['Pilates','Barre','Postnatal fitness'],850,'Reformer Pilates instructor and new mom','Reformer instructor and new mom focused on pre- and postnatal fitness. Great fit for wellness, athleisure and family brands.'),
    ('tom.reilly','Tom Reilly','Cycling','Gravel and road','Masters','USA Cycling Masters','Kansas City','MO','64108',1971,'Male',array['White'],71,172,10.5,'Gray','short','Blue',array['print','commercial'],array['Road cycling','Gravel racing','Bike maintenance'],900,'Masters gravel racer, 55, rides 200 miles a week','Masters gravel racer who rides 200 miles a week. Ideal for cycling, outdoor, nutrition and active-aging brands.'),
    ('leilani.kahale','Leilani Kahale','Surf','Longboard','Everyday active','Surf instructor','Encinitas','CA','92024',2000,'Female',array['Native Hawaiian / Pacific Islander'],66,132,8.0,'Brown','long','Brown',array['print','commercial','social'],array['Surfing','Paddleboarding','Ocean safety'],1100,'Longboard surfer and surf instructor','Longboarder and surf instructor. Comfortable in water and beach shoots for swim, sunscreen and outdoor brands.'),
    ('andre.silva','Andre Silva','Personal Training','Strength coach','Fitness professional','NASM-certified trainer','Miami','FL','33131',1988,'Male',array['Hispanic / Latino','Black / African American'],70,190,11.0,'Black','short','Brown',array['commercial','social','appearance'],array['Strength training','Boxing','Bilingual Portuguese'],1000,'Strength coach with 80K followers','NASM-certified strength coach with an engaged fitness audience. Strong for gym, supplement and app campaigns, and UGC.'),
    ('mei.lin','Mei Lin','Rock Climbing','Bouldering','Everyday active','Brooklyn Boulders member','New York','NY','10001',1978,'Female',array['Asian'],63,118,6.5,'Black','short','Brown',array['print','social'],array['Bouldering','Hiking','Mandarin'],700,'Architect and climber, 48','Architect and lifelong climber who boulders four nights a week. Great for outdoor, gear and active-aging campaigns.'),
    ('jasmine.carter','Jasmine Carter','Dance Fitness','Dance cardio instructor','Fitness professional','Dance fitness instructor','Los Angeles','CA','90012',1993,'Female',array['Black / African American'],67,195,9.5,'Black','long','Brown',array['commercial','social','appearance'],array['Dance cardio','Choreography','Body-positive fitness'],1000,'Body-positive dance fitness instructor','Dance cardio instructor focused on body-positive fitness. High energy on camera, great for activewear, wellness and inclusive campaigns.'),
    ('ethan.walker','Ethan Walker','Skateboarding','Street','Everyday active','Local skate shop team','San Diego','CA','92101',2007,'Male',array['White'],70,150,10.0,'Brown','medium','Hazel',array['print','social'],array['Skateboarding','Filming','Graphic design'],500,'Street skater and filmer, 19','19-year-old street skater on a local shop team. Natural for youth-culture, footwear and apparel shoots.'),
    ('robert.hayes','Robert Hayes','Masters Swimming','Freestyle','Masters','U.S. Masters Swimming','Newport Beach','CA','92660',1954,'Male',array['Black / African American'],72,180,11.0,'Gray','buzz','Brown',array['print','commercial'],array['Open water swimming','Golf','Grandfather of five'],800,'Masters swimmer and grandfather, 72','Retired engineer and U.S. Masters swimmer who still swims 4,000 yards a day. Perfect for active-aging, health and family campaigns.')
  ) as t(handle,name,sport,pos,lvl,school,city,st,zip,yr,gender,eth,ht,wt,shoe,hair,hairlen,eyes,gigs,skills,rate,headline,bio)
  loop
    uid := pg_temp.demo_user(r.handle || '@saltdemo.com');
    insert into accounts (id, role, email, full_name, status) values (uid, 'talent', r.handle || '@saltdemo.com', r.name, 'approved');
    insert into talent_profiles (id, slug, display_name, headline, bio, city, state, zip, travel_radius_mi,
      sport, position, level, school, birth_year, gender, ethnicity, height_in, weight_lb, shoe_size,
      hair_color, hair_length, eye_color, sizes, gig_types, skills, day_rate, headshot_path)
    values (uid, replace(r.handle, '.', '-'), r.name, r.headline, r.bio, r.city, r.st, r.zip, 50,
      r.sport, r.pos, r.lvl, r.school, r.yr, r.gender, r.eth, r.ht, r.wt, r.shoe, r.hair, r.hairlen, r.eyes,
      jsonb_build_object('shirt', case when r.ht > 70 then 'L' else 'M' end), r.gigs::gig_type[], r.skills, r.rate,
      '/demo/' || replace(r.handle, '.', '-') || '.svg');
    insert into media (owner_id, kind, title, status, storage_path, sort_order)
      values (uid, 'photo', 'Headshot', 'ready', '/demo/' || replace(r.handle, '.', '-') || '.svg', 0);
    insert into media (owner_id, kind, title, status, storage_path, duration_seconds, sort_order)
      values (uid, 'video', r.name || ' highlight reel', 'ready', '/demo/' || replace(r.handle, '.', '-') || '-reel.mp4', 8, 1);
  end loop;
end $$;

-- Two lifestyle jobs so this talent has something to apply to
insert into jobs (company_id, created_by, title, description, gig_type, sports, city, state,
  shoot_start, shoot_end, rate_usd, usage_terms, openings, ncaa_eligible, status)
select c.id, m.account_id, j.title, j.descr, j.gig::gig_type, j.sports, j.city, j.st,
  current_date + j.days, current_date + j.days, j.rate, j.usage, j.openings, true, 'open'
from (values
  ('Coastline Hydration (Demo)','Active-aging hydration campaign','Real people 50+ who stay active: walkers, swimmers, cyclists, pickleball players. Half-day lifestyle shoot, no modeling experience needed.','print',array['Pickleball','Cycling','Swimming'],'San Diego','CA',18,900,'Digital, social and in-store, US only, 12 months.',4),
  ('Apex Athletics (Demo)','Everyday athletes: inclusive activewear lookbook','Active people of all sizes, ages and abilities for an inclusive activewear lookbook. Instructors, weekend warriors and adaptive athletes encouraged.','print',array[]::text[],'Los Angeles','CA',25,1100,'E-commerce and social, 2 years.',6)
) as j(company, title, descr, gig, sports, city, st, days, rate, usage, openings)
join companies c on c.name = j.company
join company_members m on m.company_id = c.id
where not exists (select 1 from jobs x where x.title = j.title);

select level, count(*) from talent_profiles where id in (select id from accounts where email like '%@saltdemo.com')
group by level order by count(*) desc;
