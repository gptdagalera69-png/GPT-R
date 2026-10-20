-- Central do Mestre • primeiro banco de dados da aplicação
-- Execute somente em um projeto Supabase próprio da Central do Mestre.
-- A tabela armazena o estado de cada mestre; os monstros SRD são estáticos no repositório.
create table if not exists public.dm_workspace (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists dm_workspace_updated_idx on public.dm_workspace(updated_at);
alter table public.dm_workspace enable row level security;
revoke all on public.dm_workspace from anon;
grant select, insert, update, delete on public.dm_workspace to authenticated;
drop policy if exists dm_workspace_select_own on public.dm_workspace;
drop policy if exists dm_workspace_insert_own on public.dm_workspace;
drop policy if exists dm_workspace_update_own on public.dm_workspace;
drop policy if exists dm_workspace_delete_own on public.dm_workspace;
create policy dm_workspace_select_own on public.dm_workspace
 for select to authenticated using ((select auth.uid()) = owner_id);
create policy dm_workspace_insert_own on public.dm_workspace
 for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy dm_workspace_update_own on public.dm_workspace
 for update to authenticated using ((select auth.uid()) = owner_id)
 with check ((select auth.uid()) = owner_id);
create policy dm_workspace_delete_own on public.dm_workspace
 for delete to authenticated using ((select auth.uid()) = owner_id);
