-- Migration: Confine OAuth app tokens in the database (20261101000000)
--
-- An access token held by a connected AI app is a real user JWT. Until now nothing stopped that
-- token being pointed straight at PostgREST, where the MCP tool limits do not exist: no delete
-- tool, rate limits and caps were all people's willingness to use the endpoint.
--
-- This migration makes the database refuse, not the tool layer:
--   * public.is_app_token()      -- the token carries a client_id claim (Supabase OAuth server)
--   * restrictive policies       -- no DELETE anywhere, no team or billing writes, no ai_* writes
--   * ai_connection_settings     -- which celebrations an app may touch, and a read-only switch
--   * ai_quota_usage             -- one atomic statement instead of count-then-write
--   * ai_activity_log            -- one row per tool call, append only
--   * daily limits for app tokens -- 10 celebrations and 500 guests a day, charged where the rows
--     are actually written, so a direct PostgREST call cannot skip the tool layer's checks
--   * rsvps                      -- no app token writes a reply, in either direction
--   * has_event_role/is_event_member widened to honour the celebration scope, so every existing
--     policy that already leans on them picks it up without being rewritten
--
-- First-party sessions (the browser, or a token minted without a client_id) behave exactly as
-- before: every new rule below is either keyed off is_app_token() or scoped to the ai_* tables.

-- ============================================================================
-- 1. TOKEN CLASSIFICATION
-- ============================================================================

-- Supabase's OAuth server issues "standard Supabase JWTs that include user_id, role and
-- client_id claims" (supabase.com/docs/guides/auth/oauth-server). Its own RLS guidance is
-- `(auth.jwt() ->> 'client_id') IS NOT NULL`, which is what this wraps so the rest of the schema
-- has one place to change if the claim name ever does.
create or replace function public.current_app_client_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(btrim(auth.jwt() ->> 'client_id'), '');
$$;

create or replace function public.is_app_token()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_client_id() is not null;
$$;

create or replace function public.is_first_party_session()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_app_client_id() is null;
$$;

revoke execute on function public.current_app_client_id() from public, anon;
revoke execute on function public.is_app_token() from public, anon;
revoke execute on function public.is_first_party_session() from public, anon;
grant execute on function public.current_app_client_id() to authenticated;
grant execute on function public.is_app_token() to authenticated;
grant execute on function public.is_first_party_session() to authenticated;

-- ============================================================================
-- 2. CONNECTION SETTINGS, ACTIVITY LOG, QUOTA LEDGER
-- ============================================================================

-- Per connected app, per host. No row means "every celebration, read and write" — the behaviour
-- of a connection made before this migration existed.
create table if not exists public.ai_connection_settings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  -- null means every celebration; otherwise exactly these.
  event_ids uuid[],
  read_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, client_id),
  constraint ai_connection_settings_client_id_check check (btrim(client_id) <> '')
);

drop trigger if exists tr_ai_connection_settings_updated_at on public.ai_connection_settings;
create trigger tr_ai_connection_settings_updated_at
before update on public.ai_connection_settings
for each row execute function public.handle_updated_at();

-- One row per tool call. Never an argument, never anything a guest typed.
create table if not exists public.ai_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text,
  tool text not null,
  event_id uuid references public.events(id) on delete set null,
  outcome text not null,
  error text,
  created_at timestamptz not null default now(),
  constraint ai_activity_log_outcome_check check (outcome in ('ok', 'error'))
);

create index if not exists idx_ai_activity_log_recent
  on public.ai_activity_log (user_id, created_at desc);
create index if not exists idx_ai_activity_log_client
  on public.ai_activity_log (user_id, client_id, created_at desc);
create index if not exists idx_ai_activity_log_event
  on public.ai_activity_log (event_id);

-- Daily counters behind consume_quota(). Keyed per host, so a second app cannot inherit the first
-- one's allowance.
create table if not exists public.ai_quota_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  day date not null,
  used integer not null default 0,
  primary key (user_id, key, day),
  constraint ai_quota_usage_used_check check (used >= 0)
);

alter table public.ai_connection_settings enable row level security;
alter table public.ai_activity_log enable row level security;
alter table public.ai_quota_usage enable row level security;

-- Quota rows are written only by consume_quota(). No policy and no grant means no route in.
revoke all on table public.ai_quota_usage from anon, authenticated;

revoke all on table public.ai_connection_settings from anon;
revoke all on table public.ai_activity_log from anon;
grant select, insert, update, delete on table public.ai_connection_settings to authenticated;
grant select, insert on table public.ai_activity_log to authenticated;

-- The audit log is append-only: Supabase's default privileges hand out UPDATE and DELETE on new
-- tables, so the grant above has to be paired with an explicit revoke.
revoke update, delete on table public.ai_activity_log from authenticated;

-- Truncate bypasses RLS and trigger/references leak structure, so they never reach a non-owner role.
revoke truncate, references, trigger on table
  public.ai_connection_settings,
  public.ai_activity_log,
  public.ai_quota_usage
from authenticated, service_role;

-- The host reads their own settings; only a first-party session may change them. An app token
-- cannot widen its own scope or turn its own read-only switch off.
create policy "ai_connection_settings_select" on public.ai_connection_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_connection_settings_insert" on public.ai_connection_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.is_first_party_session());

create policy "ai_connection_settings_update" on public.ai_connection_settings
  for update to authenticated
  using ((select auth.uid()) = user_id and public.is_first_party_session())
  with check ((select auth.uid()) = user_id and public.is_first_party_session());

create policy "ai_connection_settings_delete" on public.ai_connection_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id and public.is_first_party_session());

-- The log is per host, and an app may only write rows attributed to itself: the client_id must
-- match the token's own claim, so one app cannot forge another's history.
create policy "ai_activity_log_select" on public.ai_activity_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ai_activity_log_insert" on public.ai_activity_log
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and coalesce(client_id, '') = coalesce(public.current_app_client_id(), '')
  );

-- ============================================================================
-- 3. SCOPE AND READ-ONLY HELPERS
-- ============================================================================

-- True when the caller may touch this celebration. First-party sessions always may. An app token
-- may when it has no settings row yet, or when the row names this celebration (or names none,
-- which means all of them).
create or replace function public.ai_connection_event_allowed(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_app_token() then true
    else coalesce(
      (
        select s.event_ids is null or p_event_id = any (s.event_ids)
        from public.ai_connection_settings s
        where s.user_id = (select auth.uid())
          and s.client_id = public.current_app_client_id()
      ),
      true
    )
  end;
$$;

-- True only for an OAuth app token whose connection the host has switched to read-only.
create or replace function public.ai_connection_read_only()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.is_app_token() then false
    else coalesce(
      (
        select s.read_only
        from public.ai_connection_settings s
        where s.user_id = (select auth.uid())
          and s.client_id = public.current_app_client_id()
      ),
      false
    )
  end;
$$;

revoke execute on function public.ai_connection_event_allowed(uuid) from public, anon;
revoke execute on function public.ai_connection_read_only() from public, anon;
grant execute on function public.ai_connection_event_allowed(uuid) to authenticated;
grant execute on function public.ai_connection_read_only() to authenticated;

-- ============================================================================
-- 4. THE CENTRAL PERMISSION CHECKS LEARN ABOUT SCOPE
-- ============================================================================
--
-- Every SELECT and almost every write policy in this schema already calls one of these two, so
-- widening them scopes the whole schema at once: event lists, guest pages, seating, vendors,
-- check-ins, team pages, invitation design and the storage policies on event covers.
--
-- Cost: one primary-key lookup into ai_connection_settings, and only for app tokens — the CASE
-- short-circuits first-party sessions out before the subquery is planned in.

create or replace function public.has_event_role(p_event_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
      and role = any (p_roles)
  )
  and public.ai_connection_event_allowed(p_event_id);
$$;

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
  )
  and public.ai_connection_event_allowed(p_event_id);
$$;

-- Collaborator names are only visible for celebrations this connection may see.
create or replace function public.shares_event_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members mine
    join public.event_members theirs on theirs.event_id = mine.event_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
      and public.ai_connection_event_allowed(mine.event_id)
  );
$$;

-- list_events goes through here, so the celebration list an app sees is the scoped one.
create or replace function public.get_user_events_with_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event', row_to_json(e),
        'role', em.role,
        'metrics', jsonb_build_object(
          'totalParties', coalesce(stats.total_parties, 0),
          'totalAttendees', coalesce(stats.total_attendees, 0),
          'acceptedParties', coalesce(stats.accepted_parties, 0),
          'acceptedGuests', coalesce(stats.accepted_guests, 0),
          'awaitingParties', coalesce(stats.awaiting_parties, 0),
          'awaitingGuests', coalesce(stats.awaiting_guests, 0),
          'declinedParties', coalesce(stats.declined_parties, 0),
          'declinedGuests', coalesce(stats.declined_guests, 0),
          'seatedGuests', coalesce(seats.seated_count, 0),
          'unassignedGuests', greatest(0, coalesce(stats.accepted_guests, 0) - coalesce(seats.seated_count, 0)),
          'readinessPercentage', case
            when coalesce(stats.total_attendees, 0) > 0
            then round((coalesce(stats.accepted_guests, 0)::numeric / stats.total_attendees::numeric) * 1000) / 10
            else 0
          end,
          'daysAway', greatest(0, ceil(extract(epoch from (e.date - now())) / 86400))
        )
      )
      order by e.date asc
    ),
    '[]'::jsonb
  )
  from public.events e
  join public.event_members em on em.event_id = e.id and em.user_id = (select auth.uid())
  left join lateral (
    select
      count(g.id) as total_parties,
      coalesce(sum(g.party_size), 0) as total_attendees,
      count(case when r.status = 'accepted' then 1 end) as accepted_parties,
      coalesce(sum(case when r.status = 'accepted' then r.attending_count else 0 end), 0) as accepted_guests,
      count(case when r.status is null or r.status = 'pending' then 1 end) as awaiting_parties,
      coalesce(sum(case when r.status is null or r.status = 'pending' then g.party_size else 0 end), 0) as awaiting_guests,
      count(case when r.status = 'declined' then 1 end) as declined_parties,
      coalesce(sum(case when r.status = 'declined' then g.party_size else 0 end), 0) as declined_guests
    from public.guests g
    left join public.rsvps r on r.guest_id = g.id
    where g.event_id = e.id
  ) stats on true
  left join lateral (
    select coalesce(sum(public.table_seats_used(t.id)), 0) as seated_count
    from public.tables t
    where t.event_id = e.id
  ) seats on true
  where public.ai_connection_event_allowed(e.id);
$$;

-- Same treatment for the cross-celebration search: an app token must not find a guest or vendor
-- on a celebration it has not been given.
create or replace function public.global_search(
  p_query text,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_clean_query text;
  v_escaped text;
  v_pattern text;
  v_events jsonb;
  v_guests jsonb;
  v_vendors jsonb;
  v_effective_limit integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_query := trim(coalesce(p_query, ''));
  if v_clean_query = '' then
    return jsonb_build_object(
      'events', '[]'::jsonb,
      'guests', '[]'::jsonb,
      'vendors', '[]'::jsonb
    );
  end if;

  v_effective_limit := least(greatest(coalesce(p_limit, 20), 1), 50);

  v_escaped := regexp_replace(v_clean_query, '([%_\\])', '\\\1', 'g');
  v_pattern := '%' || v_escaped || '%';

  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_events
  from (
    select
      e.id,
      e.title,
      e.couple,
      e.date,
      e.venue,
      e.slug,
      em.role as user_role
    from public.events e
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      e.title ilike v_pattern escape '\'
      or e.couple ilike v_pattern escape '\'
      or e.venue ilike v_pattern escape '\'
      or e.slug ilike v_pattern escape '\'
    )
      and public.ai_connection_event_allowed(e.id)
    order by e.date desc
    limit v_effective_limit
  ) sub;

  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_guests
  from (
    select
      g.id,
      g.event_id,
      g.name,
      g.email,
      g.phone,
      g.side,
      g.group_name,
      e.title as event_title
    from public.guests g
    join public.events e on e.id = g.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      g.name ilike v_pattern escape '\'
      or coalesce(g.email, '') ilike v_pattern escape '\'
      or coalesce(g.phone, '') ilike v_pattern escape '\'
      or coalesce(g.group_name, '') ilike v_pattern escape '\'
    )
      and public.ai_connection_event_allowed(e.id)
    order by g.name asc
    limit v_effective_limit
  ) sub;

  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_vendors
  from (
    select
      v.id,
      v.event_id,
      v.name,
      v.category,
      v.contact_name,
      v.contact_phone,
      v.contact_email,
      v.status,
      e.title as event_title
    from public.vendors v
    join public.events e on e.id = v.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      v.name ilike v_pattern escape '\'
      or v.category ilike v_pattern escape '\'
      or coalesce(v.contact_name, '') ilike v_pattern escape '\'
      or coalesce(v.contact_email, '') ilike v_pattern escape '\'
      or coalesce(v.contact_phone, '') ilike v_pattern escape '\'
    )
      and public.ai_connection_event_allowed(e.id)
    order by v.name asc
    limit v_effective_limit
  ) sub;

  return jsonb_build_object(
    'events', v_events,
    'guests', v_guests,
    'vendors', v_vendors
  );
end;
$$;

-- Reads another celebration's payment status and invited count; an app token may only ask about
-- celebrations it has been given.
create or replace function public.check_invitation_quota(
  p_event_id uuid,
  p_recipient_count integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid_at timestamptz;
  v_total_invited integer;
begin
  if not public.ai_connection_event_allowed(p_event_id) then
    raise exception 'You do not have permission to access this celebration'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  select paid_at into v_paid_at
  from public.events
  where id = p_event_id;

  if v_paid_at is not null then
    return true;
  end if;

  select count(distinct id)::integer into v_total_invited
  from public.guests
  where event_id = p_event_id and invited_at is not null;

  if (v_total_invited + p_recipient_count) > 20 then
    raise exception 'Free tier limit reached. Events with more than 20 guests require celebration pass.'
      using errcode = 'P0001', hint = 'PAYMENT_REQUIRED';
  end if;

  return true;
end;
$$;

-- These two leak across celebrations and nothing in the app calls them; a token should not be
-- able to enumerate seat counts or membership pairs it was never given.
revoke execute on function public.table_seats_used(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_event_member(uuid, uuid) from public, anon, authenticated;

-- ============================================================================
-- 5. ATOMIC QUOTA
-- ============================================================================
--
-- One statement: the insert-or-increment and the "is there room" test cannot be separated by a
-- concurrent caller. ON CONFLICT DO UPDATE takes the row lock first, so a second caller waits and
-- then re-evaluates its WHERE against the row the first caller wrote.

create or replace function public.consume_quota(
  p_key text,
  p_amount integer,
  p_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_key text := btrim(coalesce(p_key, ''));
  v_day date := (timezone('utc'::text, now()))::date;
  v_resets_at timestamptz := ((timezone('utc'::text, now()))::date + 1)::timestamp at time zone 'utc';
  v_used integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if v_key = '' then
    raise exception 'Quota key is required' using errcode = '22000';
  end if;

  if p_amount is null or p_amount < 1 then
    raise exception 'Quota amount must be at least 1' using errcode = '22000';
  end if;

  if p_daily_limit is null or p_daily_limit < 1 then
    raise exception 'Daily limit must be at least 1' using errcode = '22000';
  end if;

  insert into public.ai_quota_usage as quota (user_id, key, day, used)
  select v_user_id, v_key, v_day, p_amount
  where p_amount <= p_daily_limit
  on conflict (user_id, key, day) do update
    set used = quota.used + excluded.used
    where quota.used + excluded.used <= p_daily_limit
  returning quota.used into v_used;

  if v_used is null then
    select quota.used into v_used
    from public.ai_quota_usage quota
    where quota.user_id = v_user_id and quota.key = v_key and quota.day = v_day;

    return jsonb_build_object(
      'allowed', false,
      'used', coalesce(v_used, 0),
      'limit', p_daily_limit,
      'resetsAt', v_resets_at
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'used', v_used,
    'limit', p_daily_limit,
    'resetsAt', v_resets_at
  );
end;
$$;

revoke execute on function public.consume_quota(text, integer, integer) from public, anon;
grant execute on function public.consume_quota(text, integer, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- 5b. Daily limits that do not depend on the tool layer
-- ----------------------------------------------------------------------------
--
-- The tools already refuse an eleventh celebration and cap an import, but those checks live in
-- TypeScript: a token can walk around them by writing to the tables directly. These charges sit
-- where the rows actually appear, so the ceiling holds either way.
--
-- Both are keyed off is_app_token(), so a host's own session — which never carries a client_id —
-- is not charged and behaves exactly as before.

create or replace function public.charge_app_token_quota(
  p_key text,
  p_amount integer,
  p_daily_limit integer,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quota jsonb;
begin
  if not public.is_app_token() then
    return;
  end if;

  v_quota := public.consume_quota(p_key, p_amount, p_daily_limit);

  if not (v_quota ->> 'allowed')::boolean then
    raise exception '%', p_message
      using errcode = 'P0001', hint = 'DAILY_LIMIT';
  end if;
end;
$$;

-- A trigger function is invoked without an EXECUTE check, but the call to charge_app_token_quota
-- inside it is a normal call, so this one has to be definer-owned for the revokes below to hold.
create or replace function public.charge_guest_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.charge_app_token_quota(
    'guests',
    1,
    500,
    'Daily limit reached: this connection can add 500 guests a day. Try again tomorrow.'
  );
  return new;
end;
$$;

revoke execute on function public.charge_app_token_quota(text, integer, integer, text)
  from public, anon, authenticated;
revoke execute on function public.charge_guest_quota() from public, anon, authenticated;

-- Covers add_guest, import_guests and a direct insert alike, because they all end here.
drop trigger if exists tr_guests_app_token_quota on public.guests;
create trigger tr_guests_app_token_quota
before insert on public.guests
for each row execute function public.charge_guest_quota();

-- ============================================================================
-- 6. RESTRICTIVE POLICIES: WHAT AN APP TOKEN MAY NOT DO
-- ============================================================================
--
-- RESTRICTIVE policies AND with whatever the permissive policies allow, so nothing above needs to
-- be rewritten and first-party sessions are untouched (each one is keyed off is_app_token()).
-- Every policy is scoped TO authenticated, so anon and service_role never see them.

-- 6a. No DELETE anywhere. A token cannot remove a celebration, a guest, a vendor, a seat, a
--     check-in, a profile or a single row of history, whatever the tool layer says.
create policy "ai_app_tokens_cannot_delete" on public.profiles
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.events
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.event_members
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.event_invites
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.tables
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.guests
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.rsvps
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.seat_assignments
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.vendors
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.vendor_tasks
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.email_log
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.payments
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.invoices
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.check_ins
  as restrictive for delete to authenticated using (not public.is_app_token());
create policy "ai_app_tokens_cannot_delete" on public.ai_connection_settings
  as restrictive for delete to authenticated using (not public.is_app_token());

-- Deleting an event cover through the storage API is still a delete.
create policy "ai_app_tokens_cannot_delete_objects" on storage.objects
  as restrictive for delete to authenticated using (not public.is_app_token());

-- 6b. Team membership and roles are untouchable. This is the second line behind the checks inside
--     the four team RPCs below: even a direct write, or a future RPC that forgets to check, lands
--     here.
create policy "ai_app_tokens_cannot_manage_team_insert" on public.event_members
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_manage_team_update" on public.event_members
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());

create policy "ai_app_tokens_cannot_manage_invites_insert" on public.event_invites
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_manage_invites_update" on public.event_invites
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());

-- 6c. Billing and payments. No app token writes money rows, whatever the grant says.
create policy "ai_app_tokens_cannot_write_billing_insert" on public.payments
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_write_billing_update" on public.payments
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_write_billing_insert" on public.invoices
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_write_billing_update" on public.invoices
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());

-- Email is sent by the server, not by a connected app.
create policy "ai_app_tokens_cannot_write_email_insert" on public.email_log
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_write_email_update" on public.email_log
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());

-- 6d. Creating a celebration goes through create_event(), which the quota and the per-event rules
--     can see. A direct insert would skip both.
create policy "ai_app_tokens_cannot_insert_events" on public.events
  as restrictive for insert to authenticated with check (not public.is_app_token());

-- 6e. No RSVP writes at all, in either direction. No tool needs one, and an app that could write
--     here would be answering on a guest's behalf — forging replies and moving head counts without
--     the guest ever seeing the invitation.
create policy "ai_app_tokens_cannot_write_rsvps_insert" on public.rsvps
  as restrictive for insert to authenticated with check (not public.is_app_token());
create policy "ai_app_tokens_cannot_write_rsvps_update" on public.rsvps
  as restrictive for update to authenticated
  using (not public.is_app_token()) with check (not public.is_app_token());

-- 6f. The read-only switch. A host who flips it stops every write an app can make to their
--     celebrations, including through a raw PostgREST call.
create policy "ai_read_only_cannot_write_update" on public.events
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.tables
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.tables
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.guests
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.guests
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.rsvps
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.rsvps
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.seat_assignments
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.seat_assignments
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.vendors
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.vendors
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.vendor_tasks
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.vendor_tasks
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_insert" on public.check_ins
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
create policy "ai_read_only_cannot_write_update" on public.check_ins
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());

-- ============================================================================
-- 7. SECURITY DEFINER RPCs: THE SAME RULES INSIDE
-- ============================================================================
--
-- RLS does not apply inside a SECURITY DEFINER function, so the checks have to be repeated there
-- or the policies above are decoration. Two assertions, used by every mutating RPC below.

create or replace function public.assert_ai_write_allowed()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.ai_connection_read_only() then
    raise exception 'This AI connection is read-only. Turn write access back on in Connect your AI.'
      using errcode = '42501', hint = 'READ_ONLY';
  end if;
end;
$$;

create or replace function public.assert_ai_cannot_manage_team()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.is_app_token() then
    raise exception 'Connected AI apps cannot change team members or roles.'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;
end;
$$;

revoke execute on function public.assert_ai_write_allowed() from public, anon, authenticated;
revoke execute on function public.assert_ai_cannot_manage_team() from public, anon, authenticated;

-- create_event: read-only refuses too, because a new celebration is a write.
create or replace function public.create_event(
  p_title text,
  p_couple text,
  p_date timestamptz,
  p_venue text,
  p_area text default null,
  p_dress_code text default null,
  p_slug text default null,
  p_registry_code text default null,
  p_rsvp_by timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_event record;
  v_slug text;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'Authentication required to create a celebration';
  end if;

  perform public.assert_ai_write_allowed();

  -- The tool layer enforces the same number, but only for calls that come through /mcp. This charge
  -- is what makes the ceiling true for a token pointed straight at the RPC.
  perform public.charge_app_token_quota(
    'create_event',
    1,
    10,
    'Daily limit reached: this connection can create 10 celebrations a day. Try again tomorrow.'
  );

  if nullif(trim(p_title), '') is null then
    raise exception 'Celebration title is required';
  end if;

  if nullif(trim(p_couple), '') is null then
    raise exception 'Couple names are required';
  end if;

  if nullif(trim(p_venue), '') is null then
    raise exception 'Venue is required';
  end if;

  v_slug := coalesce(
    nullif(trim(p_slug), ''),
    lower(regexp_replace(trim(p_couple), '[^a-zA-Z0-9]+', '-', 'g'))
  );

  insert into public.events (
    title,
    couple,
    date,
    venue,
    area,
    dress_code,
    slug,
    status,
    registry_code,
    rsvp_by
  ) values (
    trim(p_title),
    trim(p_couple),
    p_date,
    trim(p_venue),
    nullif(trim(p_area), ''),
    nullif(trim(p_dress_code), ''),
    v_slug,
    'active',
    nullif(trim(p_registry_code), ''),
    p_rsvp_by
  )
  returning * into v_event;

  insert into public.profiles (id, email, full_name, avatar_url)
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(u.raw_user_meta_data->>'full_name', ''),
    coalesce(u.raw_user_meta_data->>'avatar_url', '')
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  insert into public.event_members (
    event_id,
    user_id,
    role
  ) values (
    v_event.id,
    v_user_id,
    'owner'
  );

  return jsonb_build_object(
    'id', v_event.id,
    'slug', v_event.slug
  );
end;
$$;

grant execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, timestamptz) to authenticated;
revoke execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, timestamptz) from anon, public;

-- import_guests: scope comes from has_event_role, which now honours ai_connection_settings.
create or replace function public.import_guests(
  p_event_id uuid,
  p_guests jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_idx int := 0;
  v_imported_count int := 0;
  v_name text;
  v_phone text;
  v_email text;
  v_side text;
  v_group text;
  v_notes text;
  v_party_size int;
  v_plus_ones boolean;
  v_is_vip boolean;
  v_token text;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner']) then
    raise exception 'You must be an owner or planner to import guests' using errcode = '42501';
  end if;

  perform public.assert_ai_write_allowed();

  if jsonb_typeof(p_guests) is distinct from 'array' then
    raise exception 'Payload must be a JSON array of guests' using errcode = '22000';
  end if;

  if jsonb_array_length(p_guests) > 500 then
    raise exception 'Payload exceeds maximum limit of 500 guests' using errcode = '22000';
  end if;

  for v_item in select * from jsonb_array_elements(p_guests)
  loop
    v_idx := v_idx + 1;
    v_name := trim(v_item->>'name');

    if v_name is null or length(v_name) = 0 then
      raise exception 'Row %: Guest name cannot be empty', v_idx using errcode = '22000';
    end if;

    if length(v_name) > 120 then
      raise exception 'Row %: Guest name exceeds maximum limit of 120 characters', v_idx using errcode = '22000';
    end if;

    v_email := nullif(trim(v_item->>'email'), '');
    if v_email is not null and length(v_email) > 254 then
      raise exception 'Row %: Email exceeds maximum limit of 254 characters', v_idx using errcode = '22000';
    end if;

    v_phone := nullif(trim(v_item->>'phone'), '');
    if v_phone is not null and length(v_phone) > 20 then
      raise exception 'Row %: Phone number exceeds maximum limit of 20 characters', v_idx using errcode = '22000';
    end if;

    v_group := nullif(trim(v_item->>'group_name'), '');
    if v_group is not null and length(v_group) > 80 then
      raise exception 'Row %: Group name exceeds maximum limit of 80 characters', v_idx using errcode = '22000';
    end if;

    v_notes := nullif(trim(v_item->>'notes'), '');
    if v_notes is not null and length(v_notes) > 500 then
      raise exception 'Row %: Notes exceed maximum limit of 500 characters', v_idx using errcode = '22000';
    end if;

    v_side := lower(coalesce(nullif(trim(v_item->>'side'), ''), 'mutual'));
    if v_side not in ('bride', 'groom', 'family', 'vip', 'planner', 'imported', 'mutual') then
      v_side := 'mutual';
    end if;

    v_party_size := greatest(1, least(20, coalesce((v_item->>'party_size')::int, 1)));
    v_plus_ones := coalesce((v_item->>'plus_ones_allowed')::boolean, false);
    v_is_vip := coalesce((v_item->>'is_vip')::boolean, false);

    v_token := public.generate_invitation_token();

    insert into public.guests (
      event_id,
      name,
      phone,
      email,
      side,
      group_name,
      party_size,
      plus_ones_allowed,
      is_vip,
      notes,
      rsvp_token
    ) values (
      p_event_id,
      v_name,
      v_phone,
      v_email,
      v_side,
      v_group,
      v_party_size,
      v_plus_ones,
      v_is_vip,
      v_notes,
      v_token
    );

    v_imported_count := v_imported_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'imported_count', v_imported_count);
end;
$$;

revoke execute on function public.import_guests(uuid, jsonb) from public, anon;
grant execute on function public.import_guests(uuid, jsonb) to authenticated;

-- regenerate_guest_token
create or replace function public.regenerate_guest_token(
  p_guest_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_new_token text;
begin
  select event_id into v_event_id
  from public.guests
  where id = p_guest_id;

  if v_event_id is null then
    raise exception 'Guest not found' using errcode = 'P0002';
  end if;

  if not public.has_event_role(v_event_id, array['owner', 'planner']) then
    raise exception 'You must be an owner or planner to regenerate invitation links' using errcode = '42501';
  end if;

  perform public.assert_ai_write_allowed();

  v_new_token := public.generate_invitation_token();

  update public.guests
  set rsvp_token = v_new_token,
      updated_at = now()
  where id = p_guest_id;

  return v_new_token;
end;
$$;

revoke execute on function public.regenerate_guest_token(uuid) from public, anon;
grant execute on function public.regenerate_guest_token(uuid) to authenticated;

-- track_invitations_sent
create or replace function public.track_invitations_sent(
  p_guest_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_rec record;
  v_updated_count integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_write_allowed();

  -- Enforce the free-tier invitation quota per affected event before stamping anyone as invited.
  for v_rec in (
    select g.event_id, count(distinct g.id) as to_invite_count
    from public.guests g
    where g.id = any(p_guest_ids)
      and g.invited_at is null
    group by g.event_id
  ) loop
    if not public.has_event_role(v_rec.event_id, array['owner', 'planner', 'couple']) then
      raise exception 'You do not have permission to invite guests for this event'
        using errcode = 'P0001', hint = 'NOT_PERMITTED';
    end if;

    perform public.check_invitation_quota(v_rec.event_id, v_rec.to_invite_count::integer);
  end loop;

  update public.guests g
  set invited_at = timezone('utc'::text, now())
  where g.id = any(p_guest_ids)
    and public.has_event_role(g.event_id, array['owner', 'planner', 'couple']);

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.track_invitations_sent(uuid[]) from public;
grant execute on function public.track_invitations_sent(uuid[]) to authenticated;

-- assign_seat (the seating_conflict_at side effect from phase 6 is preserved)
create or replace function public.assign_seat(
  p_guest_id uuid,
  p_table_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_table record;
begin
  select * into v_guest
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'Guest not found'
      using errcode = 'P0001', hint = 'GUEST_NOT_FOUND';
  end if;

  if not public.has_event_role(v_guest.event_id, array['owner', 'planner']) then
    raise exception 'Insufficient permissions to manage seating assignments'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_write_allowed();

  if p_table_id is null then
    delete from public.seat_assignments
    where guest_id = p_guest_id;

    return jsonb_build_object(
      'ok', true,
      'guest_id', p_guest_id,
      'seated', false,
      'table_id', null
    );
  end if;

  select * into v_table
  from public.tables
  where id = p_table_id;

  if not found or v_table.event_id <> v_guest.event_id then
    raise exception 'Table does not belong to this celebration'
      using errcode = 'P0001', hint = 'TABLE_NOT_FOUND';
  end if;

  insert into public.seat_assignments (
    guest_id,
    table_id,
    assigned_at
  ) values (
    p_guest_id,
    p_table_id,
    now()
  )
  on conflict (guest_id) do update set
    table_id = excluded.table_id,
    assigned_at = now(),
    updated_at = now();

  update public.guests
  set seating_conflict_at = null
  where id = p_guest_id and seating_conflict_at is not null;

  return jsonb_build_object(
    'ok', true,
    'guest_id', p_guest_id,
    'seated', true,
    'table_id', p_table_id,
    'table_name', v_table.name
  );
end;
$$;

grant execute on function public.assign_seat(uuid, uuid) to authenticated;
revoke execute on function public.assign_seat(uuid, uuid) from anon, public;

-- check_in
create or replace function public.check_in(
  p_event_id uuid,
  p_code text,
  p_count integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean_code text;
  v_guest record;
  v_rsvp record;
  v_table_name text;
  v_already_checked_in integer := 0;
  v_new_total integer;
  v_attending integer;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner', 'staff']) then
    raise exception 'Insufficient permissions to perform guest check-in';
  end if;

  perform public.assert_ai_write_allowed();

  v_clean_code := upper(trim(coalesce(p_code, '')));
  if v_clean_code = '' then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Please enter a valid check-in code');
  end if;

  select * into v_guest
  from public.guests
  where upper(check_in_code) = v_clean_code;

  if not found then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Check-in code not recognized');
  end if;

  if v_guest.event_id <> p_event_id then
    return jsonb_build_object(
      'status', 'wrong_event',
      'message', 'This check-in pass belongs to a different celebration',
      'guest_name', v_guest.name
    );
  end if;

  select * into v_rsvp
  from public.rsvps
  where guest_id = v_guest.id;

  if not found or v_rsvp.status <> 'accepted' then
    return jsonb_build_object(
      'status', 'not_attending',
      'message', 'Guest RSVP is not confirmed as accepted',
      'guest_name', v_guest.name,
      'rsvp_status', coalesce(v_rsvp.status, 'pending')
    );
  end if;

  v_attending := v_rsvp.attending_count;

  select coalesce(sum(checked_in_count), 0)
  into v_already_checked_in
  from public.check_ins
  where guest_id = v_guest.id and event_id = p_event_id;

  if v_already_checked_in >= v_attending then
    return jsonb_build_object(
      'status', 'already_checked_in',
      'message', 'Guest party has already fully checked in',
      'guest_name', v_guest.name,
      'checked_in_count', v_already_checked_in,
      'attending_count', v_attending
    );
  end if;

  if p_count <= 0 then
    p_count := 1;
  end if;
  if (v_already_checked_in + p_count) > v_attending then
    p_count := v_attending - v_already_checked_in;
  end if;

  v_new_total := v_already_checked_in + p_count;

  insert into public.check_ins (
    event_id,
    guest_id,
    staff_id,
    checked_in_count,
    checked_in_at
  ) values (
    p_event_id,
    v_guest.id,
    v_user_id,
    p_count,
    now()
  );

  select t.name into v_table_name
  from public.seat_assignments sa
  join public.tables t on t.id = sa.table_id
  where sa.guest_id = v_guest.id;

  return jsonb_build_object(
    'status', 'checked_in',
    'message', 'Guest successfully admitted',
    'guest_name', v_guest.name,
    'guest_id', v_guest.id,
    'admitted_now', p_count,
    'total_checked_in', v_new_total,
    'attending_count', v_attending,
    'table_name', v_table_name
  );
end;
$$;

grant execute on function public.check_in(uuid, text, integer) to authenticated;
revoke execute on function public.check_in(uuid, text, integer) from anon, public;

-- Team management: the four RPCs refuse an app token outright.
create or replace function public.invite_team_member(
  p_event_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_clean_email text;
  v_invite_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_cannot_manage_team();

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to invite team members'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if p_role not in ('owner', 'planner', 'couple', 'staff') then
    raise exception 'Invalid role: %', p_role
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  if v_caller_role = 'planner' and p_role in ('owner', 'planner') then
    raise exception 'Planners may invite only couple and staff roles'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_email := lower(trim(p_email));
  if v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid email address'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  if exists (
    select 1
    from public.event_members em
    join auth.users u on u.id = em.user_id
    where em.event_id = p_event_id and lower(u.email) = v_clean_email
  ) then
    raise exception 'User is already a member of this event'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  delete from public.event_invites
  where event_id = p_event_id and lower(email) = v_clean_email and accepted_at is null;

  v_token := public.generate_invitation_token();
  v_expires_at := timezone('utc'::text, now()) + interval '7 days';

  insert into public.event_invites (
    event_id,
    email,
    role,
    token,
    invited_by,
    expires_at
  )
  values (
    p_event_id,
    v_clean_email,
    p_role,
    v_token,
    v_caller_id,
    v_expires_at
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'id', v_invite_id,
    'event_id', p_event_id,
    'email', v_clean_email,
    'role', p_role,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.invite_team_member(uuid, text, text) from public;
grant execute on function public.invite_team_member(uuid, text, text) to authenticated;

create or replace function public.accept_team_invite(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_caller_confirmed_at timestamptz;
  v_invite record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_cannot_manage_team();

  select * into v_invite
  from public.event_invites
  where token = p_token
    and accepted_at is null
    and expires_at > timezone('utc'::text, now());

  if not found then
    raise exception 'Invitation invalid or expired'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  -- Holding the token is not proof of identity: an intercepted link would otherwise let anyone
  -- join the celebration as the invitee. The token must match the caller's confirmed email.
  select email, email_confirmed_at into v_caller_email, v_caller_confirmed_at
  from auth.users
  where id = v_caller_id;

  if v_caller_email is null or v_caller_confirmed_at is null
     or lower(v_caller_email) <> lower(v_invite.email) then
    raise exception 'Invitation invalid for current user or email not confirmed'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  perform set_config('app.invitation_accepting', 'true', true);

  insert into public.event_members (event_id, user_id, role)
  values (v_invite.event_id, v_caller_id, v_invite.role)
  on conflict (event_id, user_id)
  do update set role = excluded.role, updated_at = timezone('utc'::text, now());

  perform set_config('app.invitation_accepting', 'false', true);

  update public.event_invites
  set accepted_at = timezone('utc'::text, now())
  where id = v_invite.id;

  return jsonb_build_object(
    'event_id', v_invite.event_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.accept_team_invite(text) to authenticated;

create or replace function public.remove_team_member(
  p_event_id uuid,
  p_target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_cannot_manage_team();

  if v_caller_id = p_target_user_id then
    raise exception 'Members cannot remove themselves'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to remove team members'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_target_role
  from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  if v_caller_role = 'planner' and v_target_role in ('owner', 'planner') then
    raise exception 'Planners may manage only couple and staff'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  delete from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$$;

revoke all on function public.remove_team_member(uuid, uuid) from public;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

create or replace function public.update_team_member_role(
  p_event_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  perform public.assert_ai_cannot_manage_team();

  if v_caller_id = p_target_user_id then
    raise exception 'No one may change their own role'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if p_new_role not in ('owner', 'planner', 'couple', 'staff') then
    raise exception 'Invalid role: %', p_new_role
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to change roles'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_target_role
  from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  if v_caller_role = 'planner' and (v_target_role in ('owner', 'planner') or p_new_role in ('owner', 'planner')) then
    raise exception 'Planners may manage only couple and staff'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  update public.event_members
  set role = p_new_role, updated_at = timezone('utc'::text, now())
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$$;

revoke all on function public.update_team_member_role(uuid, uuid, text) from public;
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;
