-- Private Notizen und Wiedervorlagen am Programm-Team.
--
-- Die Handakte der Beratenden bekommt einen vierten Anker: das Programm-Team.
-- Alles, was fuer die anderen Anker gilt, gilt unveraendert: Die Notiz gehoert
-- der Person, die sie geschrieben hat - niemand sonst, auch nicht in derselben
-- Organisation. Die vorhandenen Policies pruefen nur `advisor_user_id = auth.uid()`.
--
-- EINE ABWEICHUNG, ABSICHTLICH: Bei Personen ueberlebt die Handakte einen
-- Widerruf. Beim Programm-Team nicht. Verlaesst ein Team das Programm (oder wird es
-- entfernt), gilt zugesagt, dass die Programmdaten geloescht werden; Notizen ueber
-- das Team gehoeren dazu. Sie werden mit dem Ende des Programms geloescht.
--
-- Schreiben duerfen: Inhaber der Organisation und Bezugspersonen dieses Teams,
-- solange das Programm besteht (can_keep_program_notes).

begin;

alter table public.advisor_private_notes
  add column if not exists program_id uuid references public.team_programs (id) on delete cascade;
alter table public.advisor_follow_ups
  add column if not exists program_id uuid references public.team_programs (id) on delete cascade;

alter table public.advisor_private_notes drop constraint advisor_private_notes_one_anchor;
alter table public.advisor_private_notes
  add constraint advisor_private_notes_one_anchor
    check (num_nonnulls(relationship_id, subject_user_id, review_id, program_id) = 1);
alter table public.advisor_follow_ups drop constraint advisor_follow_ups_one_anchor;
alter table public.advisor_follow_ups
  add constraint advisor_follow_ups_one_anchor
    check (num_nonnulls(relationship_id, subject_user_id, review_id, program_id) = 1);

create unique index if not exists advisor_private_notes_per_program
  on public.advisor_private_notes (program_id, advisor_user_id) where program_id is not null;
create unique index if not exists advisor_follow_ups_per_program
  on public.advisor_follow_ups (program_id, advisor_user_id) where program_id is not null;

create or replace function public.can_keep_program_notes(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and p.status <> 'ended'
      and auth.uid() is not null
      and (
        public.is_advisor_org_owner_of(p.org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  );
$$;
revoke all on function public.can_keep_program_notes(uuid) from public, anon;
grant execute on function public.can_keep_program_notes(uuid) to authenticated;

-- Mit dem Ende des Programms sind die Notizen ueber das Team weg.
create or replace function public.delete_attendance_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.team_program_attendance where program_id = new.id;
    delete from public.advisor_private_notes where program_id = new.id;
    delete from public.advisor_follow_ups where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_attendance_when_program_ends() from public, anon, authenticated;

commit;
