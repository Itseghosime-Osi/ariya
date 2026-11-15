-- AI-first plan, section B (live sync): enable realtime for tables the host
-- watches for AI-driven changes. Invitation design arrives on events; guest
-- list changes on guests (and rsvps, which hang off guests); seating changes
-- on tables and seat_assignments (assigned through the assign_seat RPC).
-- seat_assignments and rsvps carry no event_id, so subscribers listen
-- unfiltered and RLS decides what each host may see. Idempotent: safe to
-- re-run. No grant changes: every table is already readable by members.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array['events', 'guests', 'tables', 'seat_assignments', 'rsvps'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end $$;
