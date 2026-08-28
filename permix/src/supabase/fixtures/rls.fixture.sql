-- Run against a local Supabase CLI database with psql.
-- This transaction is self-cleaning and intentionally exercises role/RLS edges.
begin;

create schema if not exists private;
create schema permix_supabase_fixture;

create or replace function private.authorize(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with authorization_claim as (
    select auth.jwt() -> 'app_metadata' -> 'permissions' as permissions
  )
  select case
    when jsonb_typeof(permissions) = 'array' then exists (
      select 1
      from jsonb_array_elements_text(permissions) as permission(value)
      where permission.value = requested_permission
    )
    else false
  end
  from authorization_claim;
$$;

revoke all on function private.authorize(text) from public;
grant execute on function private.authorize(text) to authenticated;

create table permix_supabase_fixture.documents (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  body text not null
);

create table permix_supabase_fixture.update_only_documents (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  body text not null
);

insert into permix_supabase_fixture.documents (owner_id, body)
values
  ('11111111-1111-1111-1111-111111111111', 'owned'),
  ('22222222-2222-2222-2222-222222222222', 'role-visible');

insert into permix_supabase_fixture.update_only_documents (owner_id, body)
values ('11111111-1111-1111-1111-111111111111', 'cannot-see-to-update');

alter table permix_supabase_fixture.documents enable row level security;
alter table permix_supabase_fixture.update_only_documents
  enable row level security;

grant usage on schema permix_supabase_fixture
  to anon, authenticated, service_role;
grant select, insert, update, delete
  on all tables in schema permix_supabase_fixture
  to anon, authenticated, service_role;

create policy documents_select
on permix_supabase_fixture.documents
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  or private.authorize('public.tables.documents.select')
);

create policy documents_update
on permix_supabase_fixture.documents
for update
to authenticated
using (
  (select auth.uid()) = owner_id
  or private.authorize('public.tables.documents.update')
)
with check (
  (select auth.uid()) = owner_id
  or private.authorize('public.tables.documents.update')
);

create policy update_only_documents_update
on permix_supabase_fixture.update_only_documents
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

-- scenario: anonymous denied
set local role anon;
select set_config('request.jwt.claims', '{}', true);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 0 then
    raise exception 'anonymous expected 0 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: authenticated without claims denied
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 0 then
    raise exception 'claimless user expected 0 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: stale claims denied
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{"permissions":["public.tables.documents.archive"]}}',
  true
);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 0 then
    raise exception 'stale claims expected 0 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: invalid claims denied
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{"permissions":"not-an-array"}}',
  true
);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 0 then
    raise exception 'invalid claims expected 0 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: owner allowed
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"permissions":[]}}',
  true
);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 1 then
    raise exception 'owner expected 1 row, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: role permission allowed
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{"permissions":["public.tables.documents.select"]}}',
  true
);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 2 then
    raise exception 'authorized role expected 2 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

-- scenario: update without select stays invisible
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"permissions":[]}}',
  true
);
do $$
declare
  visible_rows integer;
  affected_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.update_only_documents;
  if visible_rows <> 0 then
    raise exception 'UPDATE-only row unexpectedly visible before mutation';
  end if;

  update permix_supabase_fixture.update_only_documents
  set body = 'still-hidden';
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'UPDATE policy expected 1 row, got %', affected_rows;
  end if;

  select count(*) into visible_rows
  from permix_supabase_fixture.update_only_documents;
  if visible_rows <> 0 then
    raise exception 'UPDATE-only row unexpectedly visible after mutation';
  end if;
end;
$$;
reset role;

-- scenario: service-role bypass is privileged
set local role service_role;
select set_config('request.jwt.claims', '{}', true);
do $$
declare
  visible_rows integer;
begin
  select count(*) into visible_rows
  from permix_supabase_fixture.documents;
  if visible_rows <> 2 then
    raise exception 'service role expected 2 rows, got %', visible_rows;
  end if;
end;
$$;
reset role;

rollback;
