-- Migration: Phase 6 Features (Team & Roles, Billing, Invitations, Reminders)

-- 1. Create event_invites table
create table if not exists public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'planner', 'couple', 'staff')),
  token text not null unique default public.generate_invitation_token(),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- Indices for event_invites
create index if not exists idx_event_invites_event_id on public.event_invites(event_id);
create index if not exists idx_event_invites_token on public.event_invites(token);
create unique index if not exists idx_event_invites_active on public.event_invites(event_id, lower(email)) where accepted_at is null;

-- RLS on event_invites
alter table public.event_invites enable row level security;

drop policy if exists "event_invites_select" on public.event_invites;
create policy "event_invites_select" on public.event_invites
  for select using (
    public.has_event_role(event_id, array['owner', 'planner'])
  );

drop policy if exists "event_invites_delete" on public.event_invites;
create policy "event_invites_delete" on public.event_invites
  for delete using (
    public.has_event_role(event_id, array['owner', 'planner'])
  );

-- 1b. Update handle_event_member_security to allow invitation acceptance
create or replace function public.handle_event_member_security()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_uid uuid;
  v_owner_count integer;
  v_caller_is_owner boolean;
  v_caller_is_planner boolean;
begin
  -- Bypass enforcement if called in a system/service context with no auth.uid()
  v_current_uid := auth.uid();
  if v_current_uid is null then
    return coalesce(new, old);
  end if;

  -- Bypass enforcement if accepting a valid invitation
  if current_setting('app.invitation_accepting', true) = 'true' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    -- When creating an event, the initial owner row is inserted by create_event.
    -- If no members exist yet for this event, allow inserting the initial owner.
    if not exists (select 1 from public.event_members where event_id = new.event_id) then
      if new.role = 'owner' then
        return new;
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(new.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(new.event_id, array['planner']);

    -- Only an owner may insert an event_members row with role 'owner' or 'planner'
    if new.role in ('owner', 'planner') then
      if not v_caller_is_owner then
        raise exception 'Only an event owner can add owners or planners';
      end if;
    elsif new.role in ('couple', 'staff') then
      -- Planners and owners may manage couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to add event member';
      end if;
    else
      raise exception 'Invalid member role: %', new.role;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- No one may change their own role
    if old.user_id = v_current_uid and new.role is distinct from old.role then
      raise exception 'Members cannot change their own role';
    end if;

    -- Event ID and User ID cannot be mutated
    if new.event_id is distinct from old.event_id or new.user_id is distinct from old.user_id then
      raise exception 'Cannot reassign membership identifiers';
    end if;

    -- Nobody may demote the last owner
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_owner_count
      from public.event_members
      where event_id = old.event_id and role = 'owner';

      if v_owner_count <= 1 then
        raise exception 'Cannot demote the last owner of an event';
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(old.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(old.event_id, array['planner']);

    -- Only an owner may change any member's role to/from 'owner' or 'planner'
    if (old.role in ('owner', 'planner') or new.role in ('owner', 'planner')) then
      if not v_caller_is_owner then
        raise exception 'Only an owner can modify owner or planner roles';
      end if;
    else
      -- Planners may manage only couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to update event member';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    -- If the event itself was deleted (CASCADE delete), allow
    if not exists (select 1 from public.events where id = old.event_id) then
      return old;
    end if;

    -- Nobody may remove the last owner
    if old.role = 'owner' then
      select count(*) into v_owner_count
      from public.event_members
      where event_id = old.event_id and role = 'owner';

      if v_owner_count <= 1 then
        raise exception 'Cannot remove the last owner of an event';
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(old.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(old.event_id, array['planner']);

    -- Only an owner may remove an owner or planner
    if old.role in ('owner', 'planner') then
      if not v_caller_is_owner then
        raise exception 'Only an owner can remove an owner or planner';
      end if;
    else
      -- Planners can remove couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to remove event member';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

revoke execute on function public.handle_event_member_security() from public, anon, authenticated;

-- 2. Team Management RPCs

-- invite_team_member
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

  -- Role permissions: Planners may manage only couple and staff
  if v_caller_role = 'planner' and p_role in ('owner', 'planner') then
    raise exception 'Planners may invite only couple and staff roles'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_email := lower(trim(p_email));
  if v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid email address'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Check if already an active member of this event
  if exists (
    select 1
    from public.event_members em
    join auth.users u on u.id = em.user_id
    where em.event_id = p_event_id and lower(u.email) = v_clean_email
  ) then
    raise exception 'User is already a member of this event'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Delete any expired or existing unaccepted invite for this email on this event
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

-- accept_team_invite
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

revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.accept_team_invite(text) to authenticated;

-- remove_team_member
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

  -- Delete target (tr_event_member_security enforces last owner rules)
  delete from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$$;

revoke all on function public.remove_team_member(uuid, uuid) from public;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;

-- update_team_member_role
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

  -- Planners may manage only couple and staff
  if v_caller_role = 'planner' and (v_target_role in ('owner', 'planner') or p_new_role in ('owner', 'planner')) then
    raise exception 'Planners may manage only couple and staff'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  -- Update target (tr_event_member_security enforces last owner rules)
  update public.event_members
  set role = p_new_role, updated_at = timezone('utc'::text, now())
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$$;

revoke all on function public.update_team_member_role(uuid, uuid, text) from public;
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;

-- 3. Billing & Staff Restrictions (staff blocked from billing)
drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments
  for select using (
    public.has_event_role(event_id, array['owner', 'planner', 'couple'])
  );

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
  for select using (
    public.has_event_role(event_id, array['owner', 'planner', 'couple'])
  );

-- Record successful payment (called exclusively by service_role Paystack webhook)
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

revoke all on function public.record_successful_payment(text, jsonb) from public;
-- Only service_role can call record_successful_payment

-- 4. Invitations tracking and unpaid restriction enforcement
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
  v_updated_count integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

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

-- Check invitation / reminder guest quota against payment status
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
  select paid_at into v_paid_at
  from public.events
  where id = p_event_id;

  -- If event is already paid, unlimited invitations allowed
  if v_paid_at is not null then
    return true;
  end if;

  -- Count existing guests who have been invited
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

revoke all on function public.check_invitation_quota(uuid, integer) from public;
grant execute on function public.check_invitation_quota(uuid, integer) to authenticated;
