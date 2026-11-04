# SALT — Sports and Active Lifestyle Talent

Web platform connecting athletic talent with print, commercial, social and appearance work.
Three roles: **Talent**, **Clients**, **Admins**. Built to support **60,000 talent profiles and 60,000+ videos**.

## Stack

| Layer | Vendor | Why |
|---|---|---|
| App | Next.js 15 (App Router) on **Vercel** | Server-rendered, scales automatically |
| Database + auth | **Supabase** (Postgres) | Row-level security per role, indexed search |
| Photos | Supabase Storage + CDN | Browser uploads directly, no server bottleneck |
| Video | **Mux** | Direct browser upload, encoding, adaptive streaming, thumbnails |
| Radius search | Postgres `earthdistance` + ZIP centroid table | No paid geocoding API |

## Spec coverage

| Requirement | Where |
|---|---|
| Multiple user types (talent, clients, admin) | `accounts.role`, `lib/auth.ts` `requireRole()` |
| User approval by admin | `/admin` → Approvals tab (talent accounts + client company verification) |
| Profiles for users | `/dashboard/talent`, `/talent/[slug]`, `/dashboard/client` (company, divisions, team) |
| Search by ethnicity, height, weight, shoe size, hair/eye color, hair length, radius/location, skill, age range | `/talent` → `search_talent()` SQL function |
| Job / breakdown creation by clients | `/dashboard/client/jobs/new` |
| Job / breakdown approval by admin | `/admin?tab=jobs` |
| Job / breakdown submission by talent | `/jobs/[id]` (note + optional reel/self-tape) |
| Talent selection / booking by clients | `/dashboard/client/jobs/[id]` (shortlist, pass, book) |
| Contract viewing | `/contracts/[id]` (auto-generated on booking, both parties e-sign) |
| Landing page / About page / Pricing info | `/`, `/about`, `/pricing` |
| Media uploads (photos/videos) | `components/PhotoUploader.tsx`, `components/VideoUploader.tsx` |
| NCAA compliance | NCAA status + school compliance email + acknowledgment on profile; jobs can exclude current NCAA athletes; NIL clause added to contracts |
| Client divisions + multiple users | `divisions`, `company_members`, invite flow on client dashboard |
| Content moderation, user management, system config | `/admin` Media, Users, Settings tabs |
| Dark / light mode | Theme toggle in header (saved per browser) + system default |
| Responsive | All layouts collapse to one column on phones |

## Setup (about 30 minutes)

1. **Supabase** — create a project at supabase.com (Pro plan for production).
   - SQL Editor → paste and run `supabase/schema.sql`.
   - Authentication → Providers → Email: enable, turn on "Confirm email".
   - Authentication → URL Configuration: Site URL = your domain; add `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
2. **ZIP codes for radius search** — load US ZIP centroids once:
   - Download the free US Census ZCTA Gazetteer file (`2023_Gaz_zcta_national.txt`) or GeoNames `US.zip`.
   - Import into the `zip_codes` table (columns `zip, city, state, lat, lng`) with Supabase Table Editor → Import CSV.
3. **Mux** — create an account at mux.com.
   - Settings → Access Tokens → new token with Mux Video read + write.
   - Settings → Webhooks → `https://YOUR-DOMAIN/api/mux-webhook`, copy the signing secret.
4. **Environment** — copy `.env.example` to `.env.local` and fill in the keys.
5. **Run locally** — `npm install && npm run dev` → http://localhost:3000
6. **Deploy** — push to GitHub, import in Vercel, add the same env variables.
7. **Make yourself admin** — register normally, then in Supabase SQL Editor:
   ```sql
   update accounts set role = 'admin', status = 'approved' where email = 'you@yourdomain.com';
   ```

## How it scales to 60K

- **Uploads never touch the app server.** Photos go browser → Supabase Storage; videos go browser → Mux via signed direct-upload URLs. Mux notifies `/api/mux-webhook` when a video is ready.
- **Search runs in Postgres with indexes** on every filter (B-tree on height/weight/shoe/age, GIN on ethnicity/skills/gig types, trigram on keywords, GiST on location). Results are paginated 24 at a time.
- **Per-profile caps** (5 videos up to 3 min, 20 photos up to 10 MB) keep storage cost predictable. Change them in the `enforce_media_limit` trigger and admin Settings.
- **Row-level security** enforces every permission in the database, so a bug in a page can't leak another user's data.

### Estimated monthly cost at 60K talent, 10K clients

| Item | Assumption | Approx. / month |
|---|---|---|
| Supabase Pro + compute add-on | 70K users, ~2 TB photo storage + egress | $150–400 |
| Mux storage | 60K videos × ~2 min avg (baseline tier) | ~$350–500 |
| Mux delivery | ~500K minutes watched | ~$400–500 |
| Vercel Pro | team + bandwidth | $20–150 |
| Email (Resend / Postmark) | auth + notifications | $20–50 |
| **Total** | | **~$950–1,600** |

Check current pricing on each vendor's site before budgeting; Mux encoding on the baseline tier is free, and delivery scales with views.

## Before launch

- Add Stripe Connect for payments and talent payouts (booking fee in `/pricing`).
- Email notifications (job approved, new submission, booked, contract ready) via Resend or Postmark.
- Replace the plain-text contract in `lib/actions.ts` `contractText()` with an attorney-reviewed template; consider Dropbox Sign or DocuSign for legally stronger e-signatures.
- Review NCAA/NIL handling with a compliance advisor; rules vary by state and school.
- Optional: automated image moderation (AWS Rekognition or Hive) to pre-flag uploads for the admin Media tab.
- Load test search with seeded data (e.g. 60K rows generated via `generate_series`) before launch.

## Project layout

```
app/
  page.tsx, about/, pricing/          public pages
  register/, login/, auth/callback/   email + password auth
  talent/, talent/[slug]/             search + public profiles
  jobs/, jobs/[id]/                   job board + submission
  dashboard/talent/                   profile, photos, videos, submissions, bookings
  dashboard/client/                   company, divisions, team, jobs, bookings
  dashboard/client/jobs/new|[id]      post breakdown, review applicants, book
  contracts/[id]/                     view + e-sign
  admin/                              approvals, jobs, users, media, settings
  api/uploads, api/mux-webhook        video pipeline
lib/actions.ts                        all server actions (writes)
supabase/schema.sql                   tables, indexes, search function, security policies
```
