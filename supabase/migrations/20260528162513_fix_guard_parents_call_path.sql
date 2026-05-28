-- Fix the parents UPDATE guard.
--
-- Phase 1.4 Block 2 moved is_admin() (and friends) from public into the
-- app_private schema with ALTER FUNCTION ... SET SCHEMA. The function body
-- of guard_parents_verification() still references public.is_admin(), so
-- every UPDATE on public.parents throws:
--     ERROR: function public.is_admin() does not exist
--
-- Recreate the trigger function calling app_private.is_admin() instead.
-- Returns trigger / security definer / search_path unchanged.

create or replace function app_private.guard_parents_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app_private.is_admin() then
    return new;
  end if;
  if (new.is_verified is distinct from old.is_verified)
     or (new.verified_at is distinct from old.verified_at)
     or (new.verified_by is distinct from old.verified_by) then
    raise exception 'only admin can change parent verification fields';
  end if;
  return new;
end;
$$;

-- Trigger already points at the function via OID; replacing the function body
-- is enough. (The trigger is still trg_parents_guard_verification on parents.)
