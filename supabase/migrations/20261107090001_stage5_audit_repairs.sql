-- Stage 5 audit repairs: durable contact throttling, strict Data API grants,
-- publication boundaries, and notification integrity.

alter table public.events
  add column if not exists is_published boolean not null default true;
alter table public.faqs
  add column if not exists is_published boolean not null default true;
alter table public.gallery
  add column if not exists is_published boolean not null default true;

create index if not exists idx_events_public_date
  on public.events (date) where is_published = true;
create index if not exists idx_faqs_public_order
  on public.faqs (display_order, created_at desc) where is_published = true;
create index if not exists idx_gallery_public_created
  on public.gallery (created_at desc) where is_published = true;

drop policy if exists "Public can view events" on public.events;
create policy "Public can view published events"
  on public.events for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Public can view faqs" on public.faqs;
create policy "Public can view published faqs"
  on public.faqs for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Public can view gallery" on public.gallery;
create policy "Public can view published gallery"
  on public.gallery for select
  to anon, authenticated
  using (is_published = true);

-- These resources are mutated exclusively through authenticated server routes.
-- Revoke the broad defaults first, then grant only direct public reads.
revoke all on table public.events from anon, authenticated;
revoke all on table public.faqs from anon, authenticated;
revoke all on table public.gallery from anon, authenticated;
revoke all on table public.blogs from anon, authenticated;
revoke all on table public.blog_categories from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.contact_inquiries from anon, authenticated;

grant select on table public.events to anon, authenticated;
grant select on table public.faqs to anon, authenticated;
grant select on table public.gallery to anon, authenticated;
grant select on table public.blogs to anon, authenticated;
grant select on table public.blog_categories to anon, authenticated;

drop policy if exists "Anyone can insert contact messages" on public.contact_messages;
drop policy if exists "Anyone can submit contact inquiries" on public.contact_inquiries;
drop policy if exists "Admin or self can insert notifications" on public.notifications;

-- A public bucket already supports object retrieval by URL. Removing this policy
-- prevents anonymous clients from enumerating every CMS object through Storage.
drop policy if exists "cms_assets_storage_select" on storage.objects;

-- Keep arbitrary URLs out of notification navigation. All current workflow
-- notifications use application-relative paths.
alter table public.notifications
  drop constraint if exists notifications_link_safe;
alter table public.notifications
  add constraint notifications_link_safe
  check (link is null or link ~ '^/[A-Za-z0-9/_?=&.%#-]*$');

create table if not exists internal.contact_rate_limits (
  rate_key text primary key check (char_length(rate_key) = 64),
  window_started_at timestamptz not null,
  submission_count integer not null check (submission_count between 1 and 5),
  updated_at timestamptz not null default pg_catalog.now()
);

revoke all on table internal.contact_rate_limits from public, anon, authenticated;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_rate_key text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_started_at timestamptz;
  v_submission_count integer;
  v_id uuid;
  v_created_at timestamptz;
begin
  if p_rate_key is null or char_length(p_rate_key) <> 64 then
    raise exception 'INVALID_RATE_KEY' using errcode = '22023';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100 then
    raise exception 'INVALID_CONTACT_NAME' using errcode = '22023';
  end if;
  if p_email is null or char_length(btrim(p_email)) not between 5 and 255 then
    raise exception 'INVALID_CONTACT_EMAIL' using errcode = '22023';
  end if;
  if p_phone is not null and char_length(btrim(p_phone)) > 30 then
    raise exception 'INVALID_CONTACT_PHONE' using errcode = '22023';
  end if;
  if p_message is null or char_length(btrim(p_message)) not between 10 and 3000 then
    raise exception 'INVALID_CONTACT_MESSAGE' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_rate_key, 0));

  select r.window_started_at, r.submission_count
    into v_window_started_at, v_submission_count
  from internal.contact_rate_limits as r
  where r.rate_key = p_rate_key
  for update;

  if not found then
    insert into internal.contact_rate_limits
      (rate_key, window_started_at, submission_count, updated_at)
    values (p_rate_key, v_now, 1, v_now);
  elsif v_window_started_at <= v_now - interval '1 hour' then
    update internal.contact_rate_limits
      set window_started_at = v_now,
          submission_count = 1,
          updated_at = v_now
    where rate_key = p_rate_key;
  elsif v_submission_count >= 5 then
    raise exception 'CONTACT_RATE_LIMITED' using errcode = 'P0001';
  else
    update internal.contact_rate_limits
      set submission_count = submission_count + 1,
          updated_at = v_now
    where rate_key = p_rate_key;
  end if;

  insert into public.contact_messages as cm (name, email, phone, message, status)
  values (
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_phone), ''),
    btrim(p_message),
    'unread'
  )
  returning cm.id, cm.created_at
  into v_id, v_created_at;

  return query select v_id, v_created_at;
end;
$$;

revoke execute on function public.submit_contact_message(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text)
  to service_role;
