import type { SupabaseTableOperation } from './manifest'

/**
 * Opt-in recipe for a Custom Access Token Hook. Apply it deliberately through
 * a reviewed migration, then configure the hook in Supabase Auth settings.
 */
export const SUPABASE_APP_METADATA_HOOK_RECIPE = `-- Authorization claims can be stale until token refresh.
create schema if not exists private;

create table if not exists private.user_permissions (
  user_id uuid not null references auth.users (id) on delete cascade,
  permission text not null,
  primary key (user_id, permission)
);

alter table private.user_permissions enable row level security;

create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  permissions jsonb;
begin
  select coalesce(jsonb_agg(up.permission order by up.permission), '[]'::jsonb)
  into permissions
  from private.user_permissions as up
  where up.user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims -> 'app_metadata', '{}'::jsonb)
      || jsonb_build_object('permissions', permissions),
    true
  );

  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

revoke all on function private.custom_access_token_hook(jsonb) from public;
grant execute on function private.custom_access_token_hook(jsonb)
  to supabase_auth_admin;
grant select on table private.user_permissions to supabase_auth_admin;`

/**
 * Keep this SECURITY DEFINER helper in an unexposed schema. Its fixed
 * search_path and grants are part of the boundary.
 */
export const SUPABASE_AUTHORIZE_FUNCTION_RECIPE = `create schema if not exists private;

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
grant execute on function private.authorize(text) to authenticated;`

const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/

function quoteIdentifier(identifier: string): string {
  if (!SQL_IDENTIFIER.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`)
  }
  return `"${identifier}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function createSupabaseOwnershipPredicate(ownerColumn: string): string {
  return `(select auth.uid()) = ${quoteIdentifier(ownerColumn)}`
}

export function createSupabasePermissionPredicate(permission: string): string {
  return `private.authorize(${quoteLiteral(permission)})`
}

export interface SupabaseRlsPermissions extends Readonly<
  Record<SupabaseTableOperation, string>
> {}

export interface CreateSupabaseRlsPolicyRecipeOptions {
  readonly schema: string
  readonly table: string
  readonly ownerColumn: string
  readonly permissions: SupabaseRlsPermissions
}

function policyName(table: string, operation: SupabaseTableOperation): string {
  return quoteIdentifier(`${table}_${operation}_authorized`)
}

function authorizationPredicate(
  ownerColumn: string,
  permission: string
): string {
  return `(${createSupabaseOwnershipPredicate(ownerColumn)} or ${createSupabasePermissionPredicate(permission)})`
}

/**
 * Generates an explicit owner-or-permission policy set. UPDATE deliberately
 * ships with SELECT because PostgreSQL RLS cannot update an invisible row.
 *
 * Service-role/secret-key clients bypass RLS and must stay behind a trusted
 * server boundary. app_metadata authorization claims can be stale until token
 * refresh, so shorten token lifetimes or re-verify state for sensitive writes.
 */
export function createSupabaseRlsPolicyRecipe(
  options: CreateSupabaseRlsPolicyRecipeOptions
): string {
  const schema = quoteIdentifier(options.schema)
  const table = quoteIdentifier(options.table)
  const relation = `${schema}.${table}`
  const owner = options.ownerColumn
  const select = authorizationPredicate(owner, options.permissions.select)
  const insert = authorizationPredicate(owner, options.permissions.insert)
  const update = authorizationPredicate(owner, options.permissions.update)
  const remove = authorizationPredicate(owner, options.permissions.delete)

  return `-- Service-role/secret-key clients bypass RLS; keep them at trusted boundaries.
-- app_metadata authorization claims can be stale until token refresh.
alter table ${relation} enable row level security;

drop policy if exists ${policyName(options.table, 'select')} on ${relation};
create policy ${policyName(options.table, 'select')}
on ${relation}
for select
to authenticated
using (${select});

drop policy if exists ${policyName(options.table, 'insert')} on ${relation};
create policy ${policyName(options.table, 'insert')}
on ${relation}
for insert
to authenticated
with check (${insert});

drop policy if exists ${policyName(options.table, 'update')} on ${relation};
create policy ${policyName(options.table, 'update')}
on ${relation}
for update
to authenticated
using (${update})
with check (${update});

drop policy if exists ${policyName(options.table, 'delete')} on ${relation};
create policy ${policyName(options.table, 'delete')}
on ${relation}
for delete
to authenticated
using (${remove});`
}
