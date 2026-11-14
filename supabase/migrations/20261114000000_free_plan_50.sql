-- Migration: the free allowance rises from 20 to 50 guest invitations (20261114000000)
--
-- A celebration without a Celebration Pass may now send invitations (and reminders, which use the
-- same quota) to 50 guest parties instead of 20. The function is otherwise exactly as defined in
-- 20261101000000_mcp_token_lockdown.sql: same checks, same permissions, same error code and hint,
-- so the app's PAYMENT_REQUIRED handling is unchanged. The app reads the same number from
-- apps/web/src/lib/plan.ts; change both together.
--
-- Rolling back means applying this function again with 20 in place of 50. No data changes.

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

  if (v_total_invited + p_recipient_count) > 50 then
    raise exception 'Free tier limit reached. Events with more than 50 guests require celebration pass.'
      using errcode = 'P0001', hint = 'PAYMENT_REQUIRED';
  end if;

  return true;
end;
$$;
