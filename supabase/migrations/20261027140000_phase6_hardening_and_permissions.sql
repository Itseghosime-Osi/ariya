-- Migration: Phase 6 Hardening, Function Privileges, and Permission Audit
-- Run systemic default privilege revocation
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Revoke execute on all existing functions in schema public
revoke execute on all functions in schema public from public, anon, authenticated;

-- 1. Lock down record_successful_payment
create or replace function public.record_successful_payment(
  p_payment_reference text,
  p_paystack_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment record;
  v_invoice_id uuid;
  v_inv_num text;
begin
  -- Guard inside the function: only service_role may call this function
  if auth.role() <> 'service_role' then
    raise exception 'Not permitted'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select * into v_payment
  from public.payments
  where paystack_reference = p_payment_reference;

  if not found then
    raise exception 'Payment reference not found: %', p_payment_reference
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Idempotent: if already marked success, return early
  if v_payment.status = 'success' then
    return jsonb_build_object(
      'success', true,
      'already_processed', true,
      'event_id', v_payment.event_id
    );
  end if;

  -- 1. Mark payment success
  update public.payments
  set
    status = 'success',
    paid_at = timezone('utc'::text, now()),
    channel = p_paystack_data->>'channel',
    metadata = coalesce(metadata, '{}'::jsonb) || p_paystack_data,
    updated_at = timezone('utc'::text, now())
  where id = v_payment.id;

  -- 2. Mark event paid
  update public.events
  set paid_at = timezone('utc'::text, now())
  where id = v_payment.event_id;

  -- 3. Issue or update invoice
  select id into v_invoice_id
  from public.invoices
  where payment_id = v_payment.id;

  if v_invoice_id is null then
    v_inv_num := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(replace(v_payment.id::text, '-', ''), 1, 6));
    insert into public.invoices (
      payment_id,
      event_id,
      invoice_number,
      amount_kobo,
      status,
      paid_at
    )
    values (
      v_payment.id,
      v_payment.event_id,
      v_inv_num,
      v_payment.amount_kobo,
      'paid',
      timezone('utc'::text, now())
    )
    returning id into v_invoice_id;
  else
    update public.invoices
    set
      status = 'paid',
      paid_at = timezone('utc'::text, now())
    where id = v_invoice_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_processed', false,
    'event_id', v_payment.event_id,
    'invoice_id', v_invoice_id
  );
end;
$$;

revoke all on function public.record_successful_payment(text, jsonb) from public, anon, authenticated;
grant execute on function public.record_successful_payment(text, jsonb) to service_role;

-- 2. Hardened accept_team_invite with confirmed email match
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

  select * into v_invite
  from public.event_invites
  where token = p_token
    and accepted_at is null
    and expires_at > timezone('utc'::text, now());

  if not found then
    raise exception 'Invitation invalid or expired'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  -- Require lower(auth.email()) = lower(invite.email) and a confirmed email
  select email, email_confirmed_at into v_caller_email, v_caller_confirmed_at
  from auth.users
  where id = v_caller_id;

  if v_caller_email is null or v_caller_confirmed_at is null or lower(v_caller_email) <> lower(v_invite.email) then
    raise exception 'Invitation invalid for current user or email not confirmed'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  -- Insert/update member into event_members
  perform set_config('app.invitation_accepting', 'true', true);

  insert into public.event_members (event_id, user_id, role)
  values (v_invite.event_id, v_caller_id, v_invite.role)
  on conflict (event_id, user_id)
  do update set role = excluded.role, updated_at = timezone('utc'::text, now());

  perform set_config('app.invitation_accepting', 'false', true);

  -- Mark invite accepted
  update public.event_invites
  set accepted_at = timezone('utc'::text, now())
  where id = v_invite.id;

  return jsonb_build_object(
    'event_id', v_invite.event_id,
    'role', v_invite.role
  );
end;
$$;

-- 3. Hardened track_invitations_sent enforcing free-tier quota directly
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

  -- For each distinct event affected by newly invited guests, enforce quota
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

-- 4. Explicit re-grant to anon and authenticated
grant execute on function public.get_public_event(text) to anon, authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;
grant execute on function public.get_check_in_code(text) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, integer, text, text, text, text) to anon, authenticated;
grant execute on function public.is_event_member(uuid) to anon, authenticated;
grant execute on function public.is_event_member(uuid, uuid) to anon, authenticated;
grant execute on function public.has_event_role(uuid, text[]) to anon, authenticated;

-- Explicit re-grant to authenticated only
grant execute on function public.create_event(text, text, timestamp with time zone, text, text, text, text, text, timestamp with time zone) to authenticated;
grant execute on function public.get_user_events_with_metrics() to authenticated;
grant execute on function public.search_guests(uuid, text, text, text, text, text, boolean, integer, integer) to authenticated;
grant execute on function public.find_import_duplicates(uuid, jsonb) to authenticated;
grant execute on function public.import_guests(uuid, jsonb) to authenticated;
grant execute on function public.regenerate_guest_token(uuid) to authenticated;
grant execute on function public.assign_seat(uuid, uuid) to authenticated;
grant execute on function public.table_seats_used(uuid, uuid) to authenticated;
grant execute on function public.check_in(uuid, text, integer) to authenticated;
grant execute on function public.invite_team_member(uuid, text, text) to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.track_invitations_sent(uuid[]) to authenticated;
grant execute on function public.check_invitation_quota(uuid, integer) to authenticated;

-- Grant service_role only functions
grant execute on function public.record_successful_payment(text, jsonb) to service_role;
grant execute on function public.hit_rate_limit(text, integer, interval) to service_role;

