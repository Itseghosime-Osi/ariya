begin;
select plan(10);

create extension if not exists pgtap;

-- Create test auth users
insert into auth.users (id, email)
values
  ('99999999-9999-9999-9999-999999999991'::uuid, 'owner_p6@owambe.ng'),
  ('99999999-9999-9999-9999-999999999992'::uuid, 'planner_p6@owambe.ng')
on conflict (id) do nothing;

-- Setup test celebration
create table if not exists _test_p6_data (
  event_id uuid,
  table_id uuid,
  table_large_id uuid,
  guest_pending_id uuid,
  guest_accepted_id uuid,
  guest_declined_id uuid,
  guest_expand_id uuid,
  token_expand text
);

truncate _test_p6_data;

do $$
declare
  v_res jsonb;
  v_event_id uuid;
  v_table_id uuid;
  v_table_large_id uuid;
  v_guest_p uuid;
  v_guest_a uuid;
  v_guest_d uuid;
  v_guest_exp uuid;
  v_tok_exp text;
begin
  -- Set auth context to owner
  perform set_config('request.jwt.claims', json_build_object(
    'sub', '99999999-9999-9999-9999-999999999991',
    'role', 'authenticated'
  )::text, true);

  -- Create celebration via create_event
  select public.create_event(
    p_title := 'Royal Seating Calibration Jubilee',
    p_couple := 'Simi & Ade',
    p_date := now() + interval '30 days',
    p_venue := 'Civic Centre, VI',
    p_area := 'Lagos Island'
  ) into v_res;

  v_event_id := (v_res->>'id')::uuid;

  -- Create table with capacity 6
  insert into public.tables (event_id, name, capacity, shape)
  values (v_event_id, 'Test Banquet Table', 6, 'round')
  returning id into v_table_id;

  -- Create larger table with capacity 12
  insert into public.tables (event_id, name, capacity, shape)
  values (v_event_id, 'Large Banquet Table', 12, 'round')
  returning id into v_table_large_id;

  -- Create Guest 1: Pending RSVP (party_size 2)
  insert into public.guests (event_id, name, side, group_name, party_size, plus_ones_allowed)
  values (v_event_id, 'Pending Guest', 'bride', 'Family', 2, false)
  returning id into v_guest_p;

  -- Create Guest 2: Accepted RSVP (party_size 2, attending 3 via plus one)
  insert into public.guests (event_id, name, side, group_name, party_size, plus_ones_allowed)
  values (v_event_id, 'Accepted Guest', 'groom', 'Friends', 2, true)
  returning id into v_guest_a;

  insert into public.rsvps (guest_id, status, attending_count, responded_at)
  values (v_guest_a, 'accepted', 3, now());

  -- Create Guest 3: Declined RSVP (party_size 2, attending 0)
  insert into public.guests (event_id, name, side, group_name, party_size, plus_ones_allowed)
  values (v_event_id, 'Declined Guest', 'bride', 'Colleagues', 2, false)
  returning id into v_guest_d;

  insert into public.rsvps (guest_id, status, attending_count, responded_at)
  values (v_guest_d, 'declined', 0, now());

  -- Seat all 3 guests at Test Banquet Table
  insert into public.seat_assignments (guest_id, table_id)
  values
    (v_guest_p, v_table_id),
    (v_guest_a, v_table_id),
    (v_guest_d, v_table_id);

  -- Create Guest 4 on a small table of capacity 2 to test RSVP expansion conflict
  insert into public.guests (event_id, name, side, group_name, party_size, plus_ones_allowed)
  values (v_event_id, 'Expanding Guest', 'bride', 'VIP', 1, true)
  returning id, rsvp_token into v_guest_exp, v_tok_exp;

  -- Create Heavy Party with party_size 2 for overflow test
  insert into public.guests (event_id, name, side, party_size)
  values (v_event_id, 'Heavy Party', 'bride', 2);

  insert into _test_p6_data values (
    v_event_id,
    v_table_id,
    v_table_large_id,
    v_guest_p,
    v_guest_a,
    v_guest_d,
    v_guest_exp,
    v_tok_exp
  );
end $$;

-- Test 1: table_seats_used counts: pending -> party_size(2), accepted -> attending(3), declined -> 0. Total = 5
select results_eq(
  $$
    select public.table_seats_used(table_id)
    from _test_p6_data
  $$,
  $$
    values (5::integer)
  $$,
  'table_seats_used correctly evaluates accepted(3) + pending(2) + declined(0) = 5'
);

-- Test 2: table_seats_used with p_exclude_guest excludes that guest's seats
select results_eq(
  $$
    select public.table_seats_used(table_id, guest_accepted_id)
    from _test_p6_data
  $$,
  $$
    values (2::integer)
  $$,
  'table_seats_used with exclusion excludes guest_accepted (5 - 3 = 2)'
);

-- Test 3: get_user_events_with_metrics agrees with table_seats_used
select results_eq(
  $$
    select ((m->'metrics'->>'seatedGuests')::int)
    from jsonb_array_elements(public.get_user_events_with_metrics()) m
    join _test_p6_data d on (m->'event'->>'id')::uuid = d.event_id
  $$,
  $$
    values (5::integer)
  $$,
  'get_user_events_with_metrics seatedGuests metric agrees with table_seats_used (5)'
);

-- Test 4: check_table_capacity enforces limit when adding Heavy Party (party size 2 + current 5 = 7 > capacity 6)
select throws_matching(
  $$
    insert into public.seat_assignments (guest_id, table_id)
    select g.id, d.table_id
    from public.guests g, _test_p6_data d
    where g.name = 'Heavy Party'
  $$,
  'Table capacity exceeded.*Available: 1, required: 2',
  'check_table_capacity throws capacity exceeded error'
);

-- Test 5: Seat expanding guest on a table of capacity 2 with a filler guest
do $$
declare
  v_d record;
  v_small_table uuid;
  v_filler_guest uuid;
begin
  select * into v_d from _test_p6_data;

  insert into public.tables (event_id, name, capacity, shape)
  values (v_d.event_id, 'Intimate Table', 2, 'round')
  returning id into v_small_table;

  -- Filler guest takes 1 seat
  insert into public.guests (event_id, name, side, party_size)
  values (v_d.event_id, 'Filler Guest', 'groom', 1)
  returning id into v_filler_guest;

  insert into public.seat_assignments (guest_id, table_id)
  values
    (v_filler_guest, v_small_table),
    (v_d.guest_expand_id, v_small_table);
end $$;

-- Verify both are initially seated at Intimate Table (table_seats_used = 2)
select is(
  (select count(*) from public.seat_assignments sa
   join _test_p6_data d on sa.guest_id = d.guest_expand_id)::int,
  1,
  'Expanding guest is initially assigned to Intimate Table'
);

-- Test 6: Expanding guest submits RSVP for 2 attendees (now 1 + 2 = 3 > 2 capacity)
-- RSVP succeeds normally (no error raised to guest)
select lives_ok(
  $$
    select public.submit_rsvp(
      p_token := (select token_expand from _test_p6_data),
      p_status := 'accepted',
      p_attending_count := 2
    );
  $$,
  'submit_rsvp succeeds normally when party size increases over table capacity'
);

-- Test 7: Expanding guest is unseated from the table
select is(
  (select count(*) from public.seat_assignments sa
   join _test_p6_data d on sa.guest_id = d.guest_expand_id)::int,
  0,
  'Guest seat assignment is automatically removed due to capacity conflict'
);

-- Test 8: seating_conflict_at timestamp is recorded on the guest
select is(
  (select count(*) from public.guests g
   join _test_p6_data d on g.id = d.guest_expand_id
   where g.seating_conflict_at is not null)::int,
  1,
  'seating_conflict_at is populated on guest record'
);

-- Test 9: Table seats used on Intimate Table drops to 1 (only filler guest remains)
select is(
  (select public.table_seats_used(t.id)
   from public.tables t
   join _test_p6_data d on t.event_id = d.event_id
   where t.name = 'Intimate Table')::int,
  1,
  'Table seats used drops back to 1 (only filler guest)'
);

-- Test 10: Re-assigning expanding guest to Large Banquet Table (capacity 12) clears seating_conflict_at
do $$
declare
  v_d record;
begin
  select * into v_d from _test_p6_data;
  perform public.assign_seat(v_d.guest_expand_id, v_d.table_large_id);
end $$;

select is(
  (select count(*) from public.guests g
   join _test_p6_data d on g.id = d.guest_expand_id
   where g.seating_conflict_at is null)::int,
  1,
  'assign_seat clears seating_conflict_at once guest is successfully accommodated'
);

select * from finish();
rollback;
