-- Die Frage nach der Forschungsteilnahme hoechstens EINMAL je Konto zeigen.
--
-- Wunsch von Maria (08.11.2026): Das Fenster darf nicht bei jedem Login wiederkommen. Bisher kam es, solange es keine
-- Entscheidung gab - jedes Mal. Jetzt wird beim ersten Zeigen vermerkt, dass gefragt wurde; danach erscheint das Fenster
-- nicht mehr, auch wenn jemand nicht geantwortet hat. Entscheiden laesst sich jederzeit im Account.
--
-- Das ist KEINE Einwilligung und ersetzt keine: Ohne Entscheidung (research_consent_preferences) gilt weiter "keine
-- Einwilligung" - es wird nichts fuer Forschung verwendet. Diese Tabelle haelt nur "diese Person wurde gefragt", sonst nichts.
-- Nur die Person selbst liest und schreibt ihre Zeile; mit dem Konto geloescht.

begin;

create table public.research_consent_prompt_seen (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.research_consent_prompt_seen enable row level security;
revoke all on public.research_consent_prompt_seen from anon, authenticated;
grant select on public.research_consent_prompt_seen to authenticated;
create policy research_consent_prompt_seen_own_read on public.research_consent_prompt_seen
  for select to authenticated using (user_id = auth.uid());

comment on table public.research_consent_prompt_seen is
  'Vermerkt nur, dass die Frage nach der Forschungsteilnahme einmal gezeigt wurde. Keine Einwilligung; ohne Entscheidung gilt weiter "keine Einwilligung".';

create or replace function public.mark_research_consent_prompt_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  insert into public.research_consent_prompt_seen (user_id) values (auth.uid()) on conflict (user_id) do nothing;
end;
$$;
revoke all on function public.mark_research_consent_prompt_seen() from public, anon;
grant execute on function public.mark_research_consent_prompt_seen() to authenticated;

commit;
