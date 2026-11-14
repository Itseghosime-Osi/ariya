-- Migration: the platform admin desk (20261114010000)
--
-- Àríyá's own staff get an admin desk at /admin. Everything here is reachable only with the
-- service-role key, which only the server holds: the app checks the signed-in person against
-- platform_admins (and that they passed two-step sign-in) before it runs any of it.
--
--   * platform_admins   who is an admin. Added and removed in the database only, never from the
--                       website, so a stolen admin session cannot make another admin.
--   * admin_audit_log   every admin action and every time an admin opens a guest list. Rows can
--                       be added and read, never changed or removed through the API.
--   * Functions for the actions that touch several tables at once, so each one either happens
--     completely or not at all, and is logged in the same transaction.
--
-- No client role (anon, authenticated) can read or call any of it.

-- ============================================================================
-- 1. WHO IS AN ADMIN
-- ============================================================================

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  note text
);

comment on table public.platform_admins is
  'Àríyá staff who may open /admin. Managed in the database only.';

alter table public.platform_admins enable row level security;
-- Read-only even to the server: admins are added and removed in SQL, by the database owner.
revoke all on table public.platform_admins from public, anon, authenticated, service_role;
grant select on table public.platform_admins to service_role;

create or replace function public.is_platform_admin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = p_user);
$$;

revoke all on function public.is_platform_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_platform_admin(uuid) to service_role;

-- ============================================================================
-- 2. THE ADMIN LOG
-- ============================================================================

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text not null,
  action text not null check (char_length(action) between 1 and 60),
  target_type text not null
    check (target_type in ('account', 'event', 'payment', 'ai_connection', 'guest_list')),
  target_id text,
  -- What the target was called at the time, so the log still reads after it is deleted.
  target_label text,
  reason text check (reason is null or char_length(reason) <= 500),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);

comment on table public.admin_audit_log is
  'Append-only record of admin actions and guest-list views.';

alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated, service_role;
-- Append and read only: the log cannot be edited or emptied through the API.
grant select, insert on table public.admin_audit_log to service_role;

-- ============================================================================
-- 3. ACTIONS THAT TOUCH SEVERAL TABLES
-- ============================================================================

-- Guard shared by every action: called with the service-role key, by an admin, with a reason.
create or replace function public.admin_check(p_admin uuid, p_reason text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not permitted' using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;
  if not public.is_platform_admin(p_admin) then
    raise exception 'Not an admin' using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'Give a reason for this action' using errcode = '22023', hint = 'REASON_REQUIRED';
  end if;
end;
$$;

revoke all on function public.admin_check(uuid, text) from public, anon, authenticated;

create or replace function public.admin_log(
  p_admin uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_target_label text,
  p_reason text,
  p_details jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, target_label, reason, details)
  select p_admin, coalesce(u.email, 'unknown'), p_action, p_target_type, p_target_id,
         p_target_label, nullif(btrim(p_reason), ''), coalesce(p_details, '{}'::jsonb)
  from (select p_admin as id) x
  left join auth.users u on u.id = x.id;
$$;

revoke all on function public.admin_log(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_log(uuid, text, text, text, text, text, jsonb)
  to service_role;

-- A complimentary Celebration Pass: the event unlocks with a ₦0 payment and invoice on record.
create or replace function public.admin_grant_comp_pass(
  p_event uuid,
  p_admin uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_owner uuid;
  v_payment uuid;
  v_ref text;
begin
  perform public.admin_check(p_admin, p_reason);

  select id, title, paid_at into v_event from public.events where id = p_event for update;
  if not found then
    raise exception 'Celebration not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;
  if v_event.paid_at is not null then
    raise exception 'This celebration already has a pass' using errcode = 'P0001', hint = 'ALREADY_PAID';
  end if;

  select m.user_id into v_owner
  from public.event_members m
  where m.event_id = p_event and m.role = 'owner'
  order by m.created_at
  limit 1;
  if v_owner is null then
    raise exception 'This celebration has no owner' using errcode = 'P0001', hint = 'NO_OWNER';
  end if;

  v_ref := 'COMP-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.payments (event_id, user_id, paystack_reference, amount_kobo, status,
                               channel, paid_at, metadata)
  values (p_event, v_owner, v_ref, 0, 'success', 'complimentary', now(),
          jsonb_build_object('complimentary', true, 'granted_by', p_admin, 'reason', p_reason))
  returning id into v_payment;

  update public.events set paid_at = now() where id = p_event;

  insert into public.invoices (payment_id, event_id, invoice_number, amount_kobo, status, paid_at)
  values (v_payment, p_event,
          'INV-' || to_char(now(), 'YYYYMMDD') || '-' ||
            upper(substring(replace(v_payment::text, '-', ''), 1, 6)),
          0, 'paid', now());

  perform public.admin_log(p_admin, 'grant_comp_pass', 'event', p_event::text, v_event.title,
                           p_reason, jsonb_build_object('reference', v_ref));

  return jsonb_build_object('payment_id', v_payment, 'reference', v_ref);
end;
$$;

revoke all on function public.admin_grant_comp_pass(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_grant_comp_pass(uuid, uuid, text) to service_role;

-- After Paystack has accepted a refund: the payment is refunded, its invoice void, and the event
-- loses its pass unless another successful payment still covers it.
create or replace function public.admin_record_refund(
  p_payment uuid,
  p_admin uuid,
  p_reason text,
  p_provider jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment record;
  v_title text;
  v_still_paid boolean;
begin
  perform public.admin_check(p_admin, p_reason);

  select * into v_payment from public.payments where id = p_payment for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;
  if v_payment.status <> 'success' then
    raise exception 'Only a successful payment can be refunded' using errcode = 'P0001', hint = 'NOT_REFUNDABLE';
  end if;

  update public.payments
  set status = 'refunded',
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('refund', coalesce(p_provider, '{}'::jsonb),
                              'refunded_by', p_admin, 'refund_reason', p_reason),
      updated_at = now()
  where id = p_payment;

  update public.invoices set status = 'void' where payment_id = p_payment;

  select exists (
    select 1 from public.payments
    where event_id = v_payment.event_id and status = 'success' and id <> p_payment
  ) into v_still_paid;

  if not v_still_paid then
    update public.events set paid_at = null where id = v_payment.event_id;
  end if;

  select title into v_title from public.events where id = v_payment.event_id;

  perform public.admin_log(p_admin, 'refund_payment', 'payment', p_payment::text,
                           coalesce(v_title, v_payment.paystack_reference), p_reason,
                           jsonb_build_object('reference', v_payment.paystack_reference,
                                              'amount_kobo', v_payment.amount_kobo,
                                              'pass_removed', not v_still_paid));

  return jsonb_build_object('pass_removed', not v_still_paid, 'event_id', v_payment.event_id);
end;
$$;

revoke all on function public.admin_record_refund(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_record_refund(uuid, uuid, text, jsonb) to service_role;

-- Delete one celebration and everything in it.
create or replace function public.admin_delete_event(p_event uuid, p_admin uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  perform public.admin_check(p_admin, p_reason);
  select title into v_title from public.events where id = p_event;
  if not found then
    raise exception 'Celebration not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;
  delete from public.events where id = p_event;
  perform public.admin_log(p_admin, 'delete_event', 'event', p_event::text, v_title, p_reason);
end;
$$;

revoke all on function public.admin_delete_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_delete_event(uuid, uuid, text) to service_role;

-- Before an account is deleted: remove the celebrations it alone owns (they would otherwise be
-- left with nobody able to run them) and log it. The sign-in account itself is then deleted by
-- the server through the Auth admin API, which cascades to the profile and memberships.
create or replace function public.admin_prepare_account_deletion(
  p_user uuid,
  p_admin uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_events uuid[];
begin
  perform public.admin_check(p_admin, p_reason);
  if p_user = p_admin then
    raise exception 'You cannot delete your own account here' using errcode = 'P0001', hint = 'SELF';
  end if;
  if public.is_platform_admin(p_user) then
    raise exception 'Remove this person as an admin first' using errcode = 'P0001', hint = 'IS_ADMIN';
  end if;

  select email into v_email from auth.users where id = p_user;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;

  select coalesce(array_agg(m.event_id), '{}') into v_events
  from public.event_members m
  where m.user_id = p_user and m.role = 'owner'
    and not exists (
      select 1 from public.event_members o
      where o.event_id = m.event_id and o.role = 'owner' and o.user_id <> p_user
    );

  delete from public.events where id = any(v_events);

  perform public.admin_log(p_admin, 'delete_account', 'account', p_user::text, v_email, p_reason,
                           jsonb_build_object('celebrations_deleted', cardinality(v_events)));

  return jsonb_build_object('celebrations_deleted', cardinality(v_events));
end;
$$;

revoke all on function public.admin_prepare_account_deletion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_prepare_account_deletion(uuid, uuid, text) to service_role;

-- Sign an account out of every device: its refresh tokens go, so no session can be renewed.
-- (An access token already issued keeps working until it expires, at most an hour.)
create or replace function public.admin_end_sessions(p_user uuid, p_admin uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_count integer;
begin
  perform public.admin_check(p_admin, p_reason);
  select email into v_email from auth.users where id = p_user;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;
  delete from auth.sessions where user_id = p_user;
  get diagnostics v_count = row_count;
  perform public.admin_log(p_admin, 'sign_out_everywhere', 'account', p_user::text, v_email,
                           p_reason, jsonb_build_object('sessions_ended', v_count));
  return v_count;
end;
$$;

revoke all on function public.admin_end_sessions(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_end_sessions(uuid, uuid, text) to service_role;

-- When each account last signed in, for the accounts list (auth.users is not exposed to the API).
create or replace function public.admin_account_activity(p_users uuid[])
returns table (user_id uuid, last_sign_in_at timestamptz, banned_until timestamptz,
               provider text, email_confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.last_sign_in_at, u.banned_until,
         coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
         u.email_confirmed_at is not null
  from auth.users u
  where u.id = any(p_users);
$$;

revoke all on function public.admin_account_activity(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_account_activity(uuid[]) to service_role;

-- ============================================================================
-- 4. AI CONNECTIONS ACROSS ACCOUNTS
-- ============================================================================

-- Every app a host has connected (from the auth server's consent records), newest first.
create or replace function public.admin_ai_connections(p_limit integer default 200)
returns table (
  consent_id uuid,
  user_id uuid,
  user_email text,
  client_id uuid,
  client_name text,
  redirect_uris text,
  scopes text,
  granted_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  calls_7d bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.user_id, u.email, c.client_id, cl.client_name, cl.redirect_uris, c.scopes,
         c.granted_at, c.revoked_at,
         (select max(a.created_at) from public.ai_activity_log a
           where a.user_id = c.user_id and a.client_id = c.client_id::text),
         (select count(*) from public.ai_activity_log a
           where a.user_id = c.user_id and a.client_id = c.client_id::text
             and a.created_at > now() - interval '7 days')
  from auth.oauth_consents c
  join auth.users u on u.id = c.user_id
  left join auth.oauth_clients cl on cl.id = c.client_id
  order by (c.revoked_at is null) desc, c.granted_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;

revoke all on function public.admin_ai_connections(integer) from public, anon, authenticated;
grant execute on function public.admin_ai_connections(integer) to service_role;

-- Disconnect one app from one account: the consent is revoked and the app's sessions for that
-- account end, so its next call is refused. The host can connect it again later.
create or replace function public.admin_revoke_ai_connection(
  p_consent uuid,
  p_admin uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consent record;
  v_label text;
begin
  perform public.admin_check(p_admin, p_reason);

  select c.*, u.email, cl.client_name into v_consent
  from auth.oauth_consents c
  join auth.users u on u.id = c.user_id
  left join auth.oauth_clients cl on cl.id = c.client_id
  where c.id = p_consent
  for update of c;
  if not found then
    raise exception 'Connection not found' using errcode = 'P0002', hint = 'NOT_FOUND';
  end if;
  if v_consent.revoked_at is not null then
    raise exception 'That app is already disconnected' using errcode = 'P0001', hint = 'ALREADY_REVOKED';
  end if;

  update auth.oauth_consents set revoked_at = now() where id = p_consent;
  delete from auth.sessions
  where user_id = v_consent.user_id and oauth_client_id = v_consent.client_id;

  v_label := coalesce(v_consent.client_name, 'An app') || ' for ' || v_consent.email;
  perform public.admin_log(p_admin, 'disconnect_ai_app', 'ai_connection', p_consent::text,
                           v_label, p_reason,
                           jsonb_build_object('client_id', v_consent.client_id,
                                              'user_id', v_consent.user_id));
end;
$$;

revoke all on function public.admin_revoke_ai_connection(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_revoke_ai_connection(uuid, uuid, text) to service_role;

-- ============================================================================
-- 5. HEALTH: WHEN THE SCHEDULED JOBS LAST DID SOMETHING
-- ============================================================================

create or replace function public.admin_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'last_reminder_email', (select max(sent_at) from public.email_log where template_type = 'reminder'),
    'reminders_7d', (select count(*) from public.email_log
                     where template_type = 'reminder' and sent_at > now() - interval '7 days'),
    'last_digest', (select max(sent_at) from public.digest_log),
    'digests_7d', (select count(*) from public.digest_log where sent_at > now() - interval '7 days'),
    'emails_failed_7d', (select count(*) from public.email_log
                         where status <> 'sent' and sent_at > now() - interval '7 days'),
    'studio_errors_7d', (select count(*) from public.studio_metrics
                         where kind in ('error', 'export_failed') and created_at > now() - interval '7 days'),
    'studio_exports_7d', (select count(*) from public.studio_metrics
                          where kind = 'export_ok' and created_at > now() - interval '7 days'),
    'payments_pending_over_1h', (select count(*) from public.payments
                                 where status = 'pending' and created_at < now() - interval '1 hour'
                                   and created_at > now() - interval '30 days'),
    'ai_errors_7d', (select count(*) from public.ai_activity_log
                     where outcome = 'error' and created_at > now() - interval '7 days'),
    'ai_calls_7d', (select count(*) from public.ai_activity_log
                    where created_at > now() - interval '7 days')
  );
$$;

revoke all on function public.admin_health() from public, anon, authenticated;
grant execute on function public.admin_health() to service_role;

-- ============================================================================
-- 6. READ MODELS FOR THE DESK (counted in the database, not in the browser)
-- ============================================================================

create or replace function public.admin_overview(p_warn_at integer default 40, p_free_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with windows as (
    select now() - interval '1 day' as d1, now() - interval '7 days' as d7,
           now() - interval '30 days' as d30
  ),
  invited as (
    select g.event_id, count(*) as n
    from public.guests g
    where g.invited_at is not null
    group by g.event_id
  )
  select jsonb_build_object(
    'accounts', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'd1', (select count(*) from public.profiles, windows w where created_at > w.d1),
      'd7', (select count(*) from public.profiles, windows w where created_at > w.d7),
      'd30', (select count(*) from public.profiles, windows w where created_at > w.d30)),
    'events', jsonb_build_object(
      'total', (select count(*) from public.events),
      'upcoming', (select count(*) from public.events
                   where status <> 'archived' and date >= now() - interval '1 day'),
      'd7', (select count(*) from public.events, windows w where created_at > w.d7),
      'd30', (select count(*) from public.events, windows w where created_at > w.d30)),
    'invitations', jsonb_build_object(
      'd1', (select count(*) from public.guests, windows w where invited_at > w.d1),
      'd7', (select count(*) from public.guests, windows w where invited_at > w.d7),
      'd30', (select count(*) from public.guests, windows w where invited_at > w.d30)),
    'replies', jsonb_build_object(
      'd7', (select count(*) from public.rsvps, windows w
             where status <> 'pending' and responded_at > w.d7),
      'd30', (select count(*) from public.rsvps, windows w
              where status <> 'pending' and responded_at > w.d30)),
    'checkins', jsonb_build_object(
      'd7', (select coalesce(sum(checked_in_count), 0) from public.check_ins, windows w
             where checked_in_at > w.d7),
      'd30', (select coalesce(sum(checked_in_count), 0) from public.check_ins, windows w
              where checked_in_at > w.d30)),
    'revenue', jsonb_build_object(
      'total_kobo', (select coalesce(sum(amount_kobo), 0) from public.payments where status = 'success'),
      'd30_kobo', (select coalesce(sum(amount_kobo), 0) from public.payments, windows w
                   where status = 'success' and paid_at > w.d30),
      'paid_events', (select count(*) from public.events where paid_at is not null),
      'complimentary', (select count(*) from public.payments
                        where status = 'success' and channel = 'complimentary'),
      'refunded', (select count(*) from public.payments where status = 'refunded')),
    'conversion', jsonb_build_object(
      'sending_events', (select count(*) from invited),
      'paid_sending_events', (select count(*) from invited i
                              join public.events e on e.id = i.event_id
                              where e.paid_at is not null)),
    'near_limit', coalesce((
      select jsonb_agg(row_to_json(x) order by x.invited desc)
      from (
        select e.id, e.title, e.date, i.n as invited,
               (select u.email from public.event_members m
                  join public.profiles u on u.id = m.user_id
                 where m.event_id = e.id and m.role = 'owner'
                 order by m.created_at limit 1) as owner_email
        from invited i
        join public.events e on e.id = i.event_id
        where e.paid_at is null and e.status <> 'archived'
          and e.date >= now() - interval '1 day'
          and i.n >= p_warn_at
        order by i.n desc
        limit 20
      ) x), '[]'::jsonb),
    'free_limit', p_free_limit
  );
$$;

revoke all on function public.admin_overview(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_overview(integer, integer) to service_role;

-- Accounts, newest first, optionally matching part of a name or email.
create or replace function public.admin_accounts(p_query text, p_limit integer, p_offset integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with matched as (
    select p.*
    from public.profiles p
    where coalesce(btrim(p_query), '') = ''
       or p.email ilike '%' || btrim(p_query) || '%'
       or p.full_name ilike '%' || btrim(p_query) || '%'
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select m.id, m.email, m.full_name, m.created_at,
               u.last_sign_in_at, u.banned_until,
               coalesce(u.raw_app_meta_data ->> 'provider', 'email') as provider,
               (select count(*) from public.event_members em where em.user_id = m.id) as celebrations,
               public.is_platform_admin(m.id) as is_admin
        from matched m
        left join auth.users u on u.id = m.id
        order by m.created_at desc
        limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
      ) x), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_accounts(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_accounts(text, integer, integer) to service_role;

-- Celebrations with their numbers. Filters: all, paid, free, upcoming, ended, archived.
create or replace function public.admin_events(
  p_query text,
  p_filter text,
  p_limit integer,
  p_offset integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with matched as (
    select e.*
    from public.events e
    where (coalesce(btrim(p_query), '') = ''
           or e.title ilike '%' || btrim(p_query) || '%'
           or e.couple ilike '%' || btrim(p_query) || '%'
           or e.slug ilike '%' || btrim(p_query) || '%')
      and case coalesce(p_filter, 'all')
            when 'paid' then e.paid_at is not null
            when 'free' then e.paid_at is null
            when 'upcoming' then e.status <> 'archived' and not public.event_is_expired(e.date)
            when 'ended' then public.event_is_expired(e.date)
            when 'archived' then e.status = 'archived'
            else true
          end
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select m.id, m.title, m.couple, m.date, m.status, m.paid_at, m.created_at, m.is_public,
               public.event_is_expired(m.date) as ended,
               (select count(*) from public.guests g where g.event_id = m.id) as guests,
               (select count(*) from public.guests g where g.event_id = m.id
                  and g.invited_at is not null) as invited,
               (select count(*) from public.rsvps r join public.guests g on g.id = r.guest_id
                 where g.event_id = m.id and r.status = 'accepted') as accepted,
               (select u.email from public.event_members em
                  join public.profiles u on u.id = em.user_id
                 where em.event_id = m.id and em.role = 'owner'
                 order by em.created_at limit 1) as owner_email
        from matched m
        order by m.created_at desc
        limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
      ) x), '[]'::jsonb)
  );
$$;

revoke all on function public.admin_events(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_events(text, text, integer, integer) to service_role;
