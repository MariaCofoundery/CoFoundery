begin;
-- Reuse optional per-item exclusions for the new stable development IDs.
alter table public.alignment_share_hidden_blocks drop constraint alignment_share_hidden_block_shape;
alter table public.alignment_share_hidden_blocks add constraint alignment_share_hidden_block_shape
check(block_id ~ '^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$' or block_id ~ '^(EVI|EXP|EL|VOICE|AMB|ORG)-[0-9]{2}$');

-- A product share is valid for the completed core, never for a mutable draft.
-- Existing instruments retain their previous sharing behavior.
create function public.guard_workstyle_share() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assessments a where a.id=new.assessment_id
   and a.instrument_id='founder-workstyle-pretest-8-5a-v1' and a.submitted_at is null) then
   raise exception 'workstyle_complete_before_sharing' using errcode='23514';
 end if;
 return new;
end $$;
create trigger guard_workstyle_share before insert or update on public.alignment_shares
for each row execute function public.guard_workstyle_share();
revoke all on function public.guard_workstyle_share() from public,anon,authenticated;
commit;
