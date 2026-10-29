begin;
create extension if not exists pgtap;

select plan(3);

select has_column('public', 'events', 'hall_layout', 'events.hall_layout exists');
select col_type_is('public', 'events', 'hall_layout', 'jsonb', 'events.hall_layout is jsonb');
select col_is_null('public', 'events', 'hall_layout', 'events.hall_layout is optional');

select * from finish();
rollback;
