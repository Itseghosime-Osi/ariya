-- Refinements to the rule that an event ends with its day (20261105000000_event_expiry.sql).
--
--   * Archiving and restoring only flip `status`, so they stay possible on an ended event; that is how a
--     host files a finished celebration away.
--   * A finished celebration still has bills and work to close out. A vendor's paid amount (the deposit)
--     can still be raised or corrected, and a deliverable can still be ticked. Nothing else about a vendor
--     or its tasks may change, and vendors and tasks can be neither added nor removed.

create or replace function public.guard_expired_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.event_is_expired(old.date)
     and (to_jsonb(new) - 'updated_at' - 'paid_at' - 'registry_code' - 'status')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'paid_at' - 'registry_code' - 'status') then
    raise exception 'This celebration has ended and can no longer be changed'
      using errcode = 'P0001', hint = 'EVENT_EXPIRED';
  end if;
  return new;
end;
$$;

create or replace function public.guard_expired_vendor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  v_date timestamptz;
begin
  select e.date into v_date from public.events e where e.id = v_event;
  -- No parent row: the event is being deleted and this is the cascade.
  if not found or not public.event_is_expired(v_date) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Only the paid amount may move, and never past the contract.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'deposit_kobo' - 'updated_at')
         is not distinct from
         (to_jsonb(old) - 'deposit_kobo' - 'updated_at')
     and new.deposit_kobo >= 0
     and new.deposit_kobo <= new.cost_kobo then
    return new;
  end if;

  raise exception 'This celebration has ended and can no longer be changed'
    using errcode = 'P0001', hint = 'EVENT_EXPIRED';
end;
$$;

create or replace function public.guard_expired_vendor_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  v_date timestamptz;
begin
  select e.date into v_date from public.events e where e.id = v_event;
  if not found or not public.event_is_expired(v_date) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- A deliverable may still be ticked off or un-ticked.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'is_done' - 'updated_at')
         is not distinct from
         (to_jsonb(old) - 'is_done' - 'updated_at') then
    return new;
  end if;

  raise exception 'This celebration has ended and can no longer be changed'
    using errcode = 'P0001', hint = 'EVENT_EXPIRED';
end;
$$;

revoke all on function public.guard_expired_vendor() from public, anon, authenticated;
revoke all on function public.guard_expired_vendor_task() from public, anon, authenticated;

drop trigger if exists tr_guard_expired_event_rows on public.vendors;
drop trigger if exists tr_guard_expired_event_rows on public.vendor_tasks;

create trigger tr_guard_expired_vendor
  before insert or update or delete on public.vendors
  for each row execute function public.guard_expired_vendor();

create trigger tr_guard_expired_vendor_task
  before insert or update or delete on public.vendor_tasks
  for each row execute function public.guard_expired_vendor_task();
