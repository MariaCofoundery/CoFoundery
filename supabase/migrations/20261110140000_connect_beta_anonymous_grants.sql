begin;
-- These tables already had no anon RLS policy. Remove their inherited broad
-- grants as well: anonymous CONNECT reads belong exclusively to the gated,
-- narrow public RPCs, never to the underlying tables.
revoke all on public.network_problems,public.network_ventures from public,anon;
notify pgrst,'reload schema';
commit;
