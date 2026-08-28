import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  createSupabaseOwnershipPredicate,
  createSupabasePermissionPredicate,
  createSupabaseRlsPolicyRecipe,
  SUPABASE_APP_METADATA_HOOK_RECIPE,
  SUPABASE_AUTHORIZE_FUNCTION_RECIPE,
} from './index'

describe('Supabase SQL recipes', () => {
  it('stores custom authorization claims in app_metadata', () => {
    expect(SUPABASE_APP_METADATA_HOOK_RECIPE).toContain(
      "claims -> 'app_metadata'"
    )
    expect(SUPABASE_APP_METADATA_HOOK_RECIPE).toContain(
      'private.custom_access_token_hook'
    )
    expect(SUPABASE_APP_METADATA_HOOK_RECIPE).toContain('supabase_auth_admin')
    expect(SUPABASE_APP_METADATA_HOOK_RECIPE).not.toContain('user_metadata')
  })

  it('keeps the security-definer authorization helper private and defensive', () => {
    expect(SUPABASE_AUTHORIZE_FUNCTION_RECIPE).toContain(
      'function private.authorize'
    )
    expect(SUPABASE_AUTHORIZE_FUNCTION_RECIPE).toContain('security definer')
    expect(SUPABASE_AUTHORIZE_FUNCTION_RECIPE).toContain("set search_path = ''")
    expect(SUPABASE_AUTHORIZE_FUNCTION_RECIPE).toContain('jsonb_typeof')
    expect(SUPABASE_AUTHORIZE_FUNCTION_RECIPE).not.toContain(
      'function public.authorize'
    )
  })

  it('builds ownership and permission predicates safely', () => {
    expect(createSupabaseOwnershipPredicate('owner_id')).toBe(
      '(select auth.uid()) = "owner_id"'
    )
    expect(createSupabasePermissionPredicate("documents.editor's.select")).toBe(
      "private.authorize('documents.editor''s.select')"
    )
    expect(() =>
      createSupabaseOwnershipPredicate('owner_id; drop table documents')
    ).toThrow('Invalid SQL identifier')
  })

  it('includes SELECT alongside UPDATE and documents JWT boundaries', () => {
    const recipe = createSupabaseRlsPolicyRecipe({
      schema: 'public',
      table: 'documents',
      ownerColumn: 'owner_id',
      permissions: {
        select: 'public.tables.documents.select',
        insert: 'public.tables.documents.insert',
        update: 'public.tables.documents.update',
        delete: 'public.tables.documents.delete',
      },
    })

    expect(recipe).toContain(
      'alter table "public"."documents" enable row level security'
    )
    expect(recipe).toContain('for select')
    expect(recipe).toContain('for insert')
    expect(recipe).toContain('for update')
    expect(recipe).toContain('for delete')
    expect(recipe.indexOf('for select')).toBeLessThan(
      recipe.indexOf('for update')
    )
    expect(recipe).toContain('private.authorize')
    expect(recipe).toContain('Service-role')
    expect(recipe).toContain('stale until token refresh')
    expect(recipe).not.toContain('user_metadata')
  })

  it('ships a future Supabase CLI fixture for authorization boundaries', () => {
    const fixture = readFileSync(
      'src/supabase/fixtures/rls.fixture.sql',
      'utf-8'
    )

    for (const scenario of [
      'anonymous denied',
      'authenticated without claims denied',
      'stale claims denied',
      'invalid claims denied',
      'owner allowed',
      'role permission allowed',
      'update without select stays invisible',
      'service-role bypass is privileged',
    ]) {
      expect(fixture).toContain(`scenario: ${scenario}`)
    }
    expect(fixture).toContain('rollback;')
    expect(fixture).not.toContain('user_metadata')
  })
})
