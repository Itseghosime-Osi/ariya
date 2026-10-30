-- Hall studio: one JSON document per event describing the room (size in metres, zones such as the
-- stage and dance floor, décor choices and table rotations). Table positions stay on public.tables
-- (position_x / position_y, in centimetres).
-- The column inherits the events table's RLS: members read it, owners and planners write it.

alter table public.events
  add column if not exists hall_layout jsonb
    check (
      hall_layout is null
      or (jsonb_typeof(hall_layout) = 'object' and pg_column_size(hall_layout) <= 65536)
    );

comment on column public.events.hall_layout is
  'Seating hall studio layout: room size (m), zones, decor and table rotations.';
