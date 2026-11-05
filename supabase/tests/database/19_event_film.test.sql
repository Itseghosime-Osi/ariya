begin;
create extension if not exists pgtap;

select plan(10);

select has_column('public', 'events', 'film_design', 'events has film_design');
select col_not_null('public', 'events', 'invitation_live', 'invitation_live is never null');
select col_default_is('public', 'events', 'invitation_live', 'true', 'existing and new events are live by default');

select ok(
  exists (select 1 from storage.buckets where id = 'event-film' and public and file_size_limit = 10485760),
  'the event-film bucket is public and capped at 10 MB'
);
select ok(
  (select 'audio/mpeg' = any (allowed_mime_types) from storage.buckets where id = 'event-film'),
  'the event-film bucket takes MP3 songs'
);

create temp table fl (event_id uuid, token text);
do $$
declare
  v_event uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
begin
  insert into public.events (id, title, couple, date, venue, slug, is_public, film_design, invitation_live)
  values (
    v_event, 'Film Owambe', 'Film & Couple', now() + interval '40 days', 'Hall', 'film-slug', true,
    '{"enabled": true, "scenes": []}'::jsonb, false
  );
  insert into public.guests (id, event_id, name, rsvp_token, check_in_code)
  values (v_guest, v_event, 'Chief Film Guest', 'film-token-1', 'FILM1');
  insert into fl select v_event, rsvp_token from public.guests where id = v_guest;
end $$;

select throws_ok(
  $$ update public.events set film_design = '[1,2]'::jsonb where id = (select event_id from fl) $$,
  '23514',
  null,
  'a film design must be an object'
);
select throws_ok(
  format($$ update public.events set film_design = jsonb_build_object('x', %L) where id = (select event_id from fl) $$, repeat('a', 30000)),
  '23514',
  null,
  'a film design cannot be huge'
);

select is(
  (public.get_public_event('film-slug') ->> 'invitation_live')::boolean,
  false,
  'the public page is told the invitation is in test mode'
);
select is(
  public.get_public_event('film-slug') -> 'film_design' ->> 'enabled',
  'true',
  'the public page is handed the film'
);
select is(
  public.get_invitation((select token from fl)) -> 'event' -> 'film_design' ->> 'enabled',
  'true',
  'a guest''s link is handed the film too'
);

select * from finish();
rollback;
