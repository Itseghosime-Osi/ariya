begin;
create extension if not exists pgtap;

select plan(10);

create temp table s (staff_id uuid, couple_id uuid, event_id uuid, other_event uuid);
grant select on s to authenticated, anon;

do $$
declare
  v_staff uuid := gen_random_uuid();
  v_couple uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_g1 uuid := gen_random_uuid();
  v_g2 uuid := gen_random_uuid();
  v_g3 uuid := gen_random_uuid();
  v_g4 uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values
    (v_staff, 'search-staff@owambe.test'), (v_couple, 'search-couple@owambe.test');
  insert into public.events (id, slug, title, couple, date, venue, status, is_public) values
    (v_event, 'search-gala', 'Search Gala', 'A & B', now() + interval '30 days', 'Hall', 'active', true),
    (v_other, 'search-other', 'Other Gala', 'C & D', now() + interval '30 days', 'Hall', 'active', true);
  insert into public.event_members (event_id, user_id, role) values
    (v_event, v_staff, 'staff'), (v_event, v_couple, 'couple');
  insert into public.guests (id, event_id, name, party_size, plus_ones_allowed, check_in_code) values
    (v_g1, v_event, 'Chief Adeleke', 2, false, 'SRCH1'),
    (v_g2, v_event, 'Ada 100% Okafor', 1, false, 'SRCH2'),
    (v_g3, v_event, 'Adaeze Pending', 1, false, 'SRCH3'),
    (v_g4, v_other, 'Adeleke Elsewhere', 1, false, 'SRCH4');
  insert into public.rsvps (guest_id, status, attending_count, responded_at) values
    (v_g1, 'accepted', 2, now()),
    (v_g2, 'accepted', 1, now()),
    (v_g3, 'pending', 1, null),
    (v_g4, 'accepted', 1, now());
  insert into s select v_staff, v_couple, v_event, v_other;
end $$;

set local role anon;
select throws_ok(
  $$ select public.search_check_in_guests((select event_id from s), 'ade') $$,
  '42501', null, 'anon cannot search the guest list'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select couple_id from s), 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select public.search_check_in_guests((select event_id from s), 'ade') $$,
  null, null, 'the couple (not door staff) cannot search'
);

select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from s), 'role', 'authenticated')::text, true);
select is(
  public.search_check_in_guests((select event_id from s), ' CHIEF ') -> 0 ->> 'code',
  'SRCH1', 'staff find an accepted guest by part of the name, case and spaces ignored'
);
select is(
  jsonb_array_length(public.search_check_in_guests((select event_id from s), 'ad')),
  2, 'only accepted guests of this celebration are offered (not the pending one, not another event)'
);
select is(
  jsonb_array_length(public.search_check_in_guests((select event_id from s), 'a')),
  0, 'one letter returns nothing'
);
select is(
  public.search_check_in_guests((select event_id from s), '%%') ->> 0,
  null, 'a typed percent is a character, not a wildcard'
);
select is(
  jsonb_array_length(public.search_check_in_guests((select event_id from s), '100%')),
  1, 'a literal percent in a name can be searched'
);
select is(
  (public.search_check_in_guests((select event_id from s), 'adeleke') -> 0 ->> 'attending_count')::int,
  2, 'the party size comes back'
);

select public.check_in((select event_id from s), 'SRCH1', 1);
select is(
  (public.search_check_in_guests((select event_id from s), 'adeleke') -> 0 ->> 'checked_in_count')::int,
  1, 'how many have already arrived comes back'
);
select throws_ok(
  $$ select public.search_check_in_guests((select other_event from s), 'ade') $$,
  null, null, 'staff of one celebration cannot search another'
);

select * from finish();
rollback;
