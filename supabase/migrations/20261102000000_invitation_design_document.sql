-- The invitation studio saves one document per celebration: theme, palette, background and the
-- positioned layers. The legacy invitation_theme / _headline / _subheadline / _message columns stay
-- in step with it, so the guest pass, the emails and the connected AI keep reading the same words.

alter table public.events
  add column if not exists invitation_design jsonb
    check (
      invitation_design is null
      or jsonb_typeof(invitation_design) = 'object'
    );

comment on column public.events.invitation_design is
  'Invitation studio document. Mirrored into invitation_theme, invitation_headline, invitation_subheadline and invitation_message on every save.';
