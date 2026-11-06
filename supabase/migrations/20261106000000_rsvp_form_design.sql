-- The guest's invitation is drawn from the host's saved studio design (including the entry seal that
-- carries the guest's code), so get_rsvp_form now hands the page that design too. It holds only what
-- the public invitation already shows: theme, colours, background and positioned words.

create or replace function public.get_rsvp_form(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_event record;
  v_answers jsonb;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;

  select * into v_guest from public.guests where rsvp_token = trim(p_token);
  if not found then
    return null;
  end if;

  select rsvp_questions, require_access_card, invitation_design into v_event
  from public.events where id = v_guest.event_id;
  if not found then
    return null;
  end if;

  select a.answers into v_answers from public.rsvp_answers a where a.guest_id = v_guest.id;

  return jsonb_build_object(
    'questions', v_event.rsvp_questions,
    'require_access_card', v_event.require_access_card,
    'answers', coalesce(v_answers, '{}'::jsonb),
    'invitation_design', v_event.invitation_design
  );
end;
$$;

grant execute on function public.get_rsvp_form(text) to anon, authenticated;
