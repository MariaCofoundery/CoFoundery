begin;
-- A release operation must actually release an existing block. In particular it
-- cannot turn a relevant (no deletion deadline) record into an immortal draft.
create function public.radar_enforce_signal_lifecycle() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.review_status in ('new','reviewed','discarded') and new.delete_after is null then
   new.delete_after:=now()+interval '30 days';
 end if;
 if old.review_status='discarded' and new.review_status<>'discarded' then
   raise exception 'radar_signal_locked' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.radar_enforce_signal_lifecycle() from public,anon,authenticated,service_role;
create trigger radar_signal_lifecycle before update on public.radar_signals for each row execute function public.radar_enforce_signal_lifecycle();
commit;
