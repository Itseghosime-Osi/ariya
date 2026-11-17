begin;
create extension if not exists pgtap;

select plan(9);

-- One host, one free celebration and one with the Celebration Pass, each with an accepted guest.
create temp table cp (host uuid, free_event uuid, paid_event uuid, free_guest uuid, paid_guest uuid);
grant select on cp to authenticated, anon, service_role;

do $$
declare
  v_host uuid := gen_random_uuid();
  v_free uuid;
  v_paid uuid;
  v_fg uuid;
  v_pg uuid;
begin
  insert into auth.users (id, email, email_confirmed_at) values (v_host, 'pass-host@owambe.test', now());
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_host, 'role', 'authenticated')::text, true);
  v_free := (public.create_event(p_title := 'Free Gala', p_couple := 'A & B',
    p_date := now() + interval '30 days', p_venue := 'Hall', p_area := 'Ikoyi')->>'id')::uuid;
  v_paid := (public.create_event(p_title := 'Paid Gala', p_couple := 'C & D',
    p_date := now() + interval '30 days', p_venue := 'Hall', p_area := 'Ikoyi')->>'id')::uuid;
  insert into public.guests (event_id, name, party_size) values (v_free, 'Free Guest', 1) returning id into v_fg;
  insert into public.guests (event_id, name, party_size) values (v_paid, 'Paid Guest', 1) returning id into v_pg;

  -- The pass is set the way Paystack's webhook sets it: as service_role.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.events set paid_at = now() where id = v_paid;
  insert into cp values (v_host, v_free, v_paid, v_fg, v_pg);
end $$;

select is(public.event_has_pass((select free_event from cp)), false, 'a new celebration has no pass');
select is(public.event_has_pass((select paid_event from cp)), true, 'a paid celebration has the pass');

-- Door check-in: refused without the pass, recorded with it.
select throws_ok(
  format('insert into public.check_ins (event_id, guest_id) values (%L, %L)',
         (select free_event from cp), (select free_guest from cp)),
  'P0001', 'This needs the Celebration Pass for this celebration.',
  'a check-in on a free celebration is refused');
select lives_ok(
  format('insert into public.check_ins (event_id, guest_id) values (%L, %L)',
         (select paid_event from cp), (select paid_guest from cp)),
  'a check-in on a paid celebration is recorded');

-- Team invitations: refused without the pass, sent with it.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from cp), 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  format('select public.invite_team_member(%L, %L, %L)', (select free_event from cp), 'planner@pass.test', 'planner'),
  'P0001', null,
  'the host cannot invite a team member to a free celebration');
select lives_ok(
  format('select public.invite_team_member(%L, %L, %L)', (select paid_event from cp), 'planner@pass.test', 'planner'),
  'the host can invite a team member to a paid celebration');

-- The host's own session reaches both celebrations; a connected AI app reaches only the paid one.
select is(public.has_event_role((select free_event from cp), array['owner']), true,
  'the host reaches their free celebration themselves');
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from cp), 'role', 'authenticated', 'client_id', 'pass-app')::text, true);
select is(public.has_event_role((select free_event from cp), array['owner']), false,
  'a connected AI app cannot reach a free celebration');
select is(public.has_event_role((select paid_event from cp), array['owner']), true,
  'a connected AI app reaches a paid celebration');
reset role;

select * from finish();
rollback;
