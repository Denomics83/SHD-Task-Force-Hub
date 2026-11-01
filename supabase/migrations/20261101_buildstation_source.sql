-- Run this in the Supabase SQL editor before saving an imported build.
-- It does not change existing rows. source_raw holds the Build Station
-- dbBuild object; source_url and source_id point back at the share page.

alter table public.builds add column if not exists source_url text;
alter table public.builds add column if not exists source_id text;
alter table public.builds add column if not exists source_raw jsonb;
