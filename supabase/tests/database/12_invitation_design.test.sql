begin;
create extension if not exists pgtap;

select plan(12);

-- 1. Verify column update privilege on events for authenticated
select is(
  has_column_privilege('authenticated', 'public.events', 'invitation_theme', 'update'),
  true,
  'authenticated CAN update events.invitation_theme'
);

select is(
  has_column_privilege('authenticated', 'public.events', 'invitation_headline', 'update'),
  true,
  'authenticated CAN update events.invitation_headline'
);

select is(
  has_column_privilege('authenticated', 'public.events', 'invitation_subheadline', 'update'),
  true,
  'authenticated CAN update events.invitation_subheadline'
);

select is(
  has_column_privilege('authenticated', 'public.events', 'invitation_message', 'update'),
  true,
  'authenticated CAN update events.invitation_message'
);

-- 2. Verify column update privilege on events for anon is false
select is(
  has_column_privilege('anon', 'public.events', 'invitation_theme', 'update'),
  false,
  'anon CANNOT update events.invitation_theme'
);

select is(
  has_column_privilege('anon', 'public.events', 'invitation_headline', 'update'),
  false,
  'anon CANNOT update events.invitation_headline'
);

select is(
  has_column_privilege('anon', 'public.events', 'invitation_subheadline', 'update'),
  false,
  'anon CANNOT update events.invitation_subheadline'
);

select is(
  has_column_privilege('anon', 'public.events', 'invitation_message', 'update'),
  false,
  'anon CANNOT update events.invitation_message'
);

-- 3. Functional check: get_invitation returns saved design properties
create temp table _test_invitation_data (
  token text,
  event_id uuid
);

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_event uuid;
  v_token text := 'test_token_' || substr(gen_random_uuid()::text, 1, 12);
begin
  insert into auth.users (id, email) values (v_owner, 'owner_inv_test@example.com');
  insert into public.profiles (id, email, full_name) values (v_owner, 'owner_inv_test@example.com', 'Test Owner')
  on conflict (id) do update set full_name = 'Test Owner';

  insert into public.events (
    title, slug, date, couple, venue,
    invitation_theme, invitation_headline, invitation_subheadline, invitation_message
  )
  values (
    'Royal Nuptials Test', 'inv-test-' || substr(gen_random_uuid()::text, 1, 8),
    now() + interval '14 days', 'Chidinma & Babatunde', 'Eko Hotel',
    'emerald_regal', 'The Joyous Celebration', 'Honouring our beloved family', 'Dinner and merriment to follow'
  )
  returning id into v_event;

  insert into public.event_members (event_id, user_id, role)
  values (v_event, v_owner, 'owner');

  insert into public.guests (event_id, name, email)
  values (v_event, 'Honoured Guest', 'honoured@example.com')
  returning rsvp_token into v_token;

  insert into _test_invitation_data (token, event_id) values (v_token, v_event);
end;
$$;

grant select on _test_invitation_data to anon;

set local role anon;

select is(
  (public.get_invitation((select token from _test_invitation_data)) -> 'event' ->> 'invitation_theme')::text,
  'emerald_regal',
  'get_invitation returns correct invitation_theme'
);

select is(
  (public.get_invitation((select token from _test_invitation_data)) -> 'event' ->> 'invitation_headline')::text,
  'The Joyous Celebration',
  'get_invitation returns correct invitation_headline'
);

select is(
  (public.get_invitation((select token from _test_invitation_data)) -> 'event' ->> 'invitation_subheadline')::text,
  'Honouring our beloved family',
  'get_invitation returns correct invitation_subheadline'
);

select is(
  (public.get_invitation((select token from _test_invitation_data)) -> 'event' ->> 'invitation_message')::text,
  'Dinner and merriment to follow',
  'get_invitation returns correct invitation_message'
);

reset role;

select * from finish();
rollback;
