begin;

-- ---------------------------------------------------------------------------
-- Welche Bereiche aus welcher Antwort kamen
-- ---------------------------------------------------------------------------
--
-- GEBRAUCHT FUER DEN BLICK ZURUECK, um den Maria am 21.09.2026 gebeten hat:
-- "was durchgehend auffiel, was du selbst zweimal erwähnt hast".
--
-- WARUM ES DAS NICHT SCHON GIBT: Beim Einordnen bestaetigt man bis zu drei
-- Bereiche, aber der BELEG haengt nur an einem davon - dem fuehrenden. Das ist
-- richtig so: Die Erzaehlung dreimal zu speichern, damit sie an drei
-- Eintraegen haengt, waere dieselbe Geschichte dreimal im Profil.
--
-- Die Folge war aber, dass sich nachher nicht mehr sagen liess, welche
-- Bereiche aus welcher Antwort kamen - und damit auch nicht, welcher in
-- MEHREREN Geschichten vorkam. Genau das ist die verlaesslichste Auskunft, die
-- dieses Verfahren hergibt: Ein Bereich aus drei verschiedenen Geschichten ist
-- etwas anderes als einer aus einer einzigen. Nicht "besser" - wiederkehrend.
--
-- Diese Tabelle haelt genau das, und nichts weiter. Keine Stufe, kein Wunsch,
-- kein Text: Das steht alles schon woanders, und ein zweiter Ort dafuer waere
-- eine zweite Wahrheit.
-- ---------------------------------------------------------------------------

create table public.capability_interview_turn_areas (
  turn_id uuid not null
    references public.capability_interview_turns (id) on delete cascade,
  area_id text not null
    references public.capability_areas (area_id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (turn_id, area_id)
);

comment on table public.capability_interview_turn_areas is
  'Welche Bereiche beim Einordnen einer Antwort bestaetigt wurden - alle, nicht nur der fuehrende, an dem der Beleg haengt. Grundlage fuer die Aussage, welcher Bereich in mehreren Geschichten vorkam.';

-- `on delete restrict` auf dem Bereich, wie bei den Eintraegen: Ein Bereich aus
-- dem Vokabular wird nicht geloescht, solange irgendwo darauf verwiesen wird.
-- `on delete cascade` auf der Antwort: Wer sein Gespraech loescht, loescht auch
-- diese Zuordnung - sie sagt ohne die Antwort nichts.

create index capability_interview_turn_areas_area_idx
  on public.capability_interview_turn_areas (area_id);

alter table public.capability_interview_turn_areas enable row level security;
revoke all on public.capability_interview_turn_areas from anon, authenticated;
grant select, insert, delete on public.capability_interview_turn_areas to authenticated;

-- UEBER DIE SITZUNG, wie bei den Antworten selbst: Eine zweite Kennung der
-- Person waere eine zweite Stelle, an der sie falsch stehen koennte.
create policy capability_interview_turn_areas_select_self
  on public.capability_interview_turn_areas
  for select to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_interview_turn_areas.turn_id
        and session.user_id = auth.uid()
    )
  );

create policy capability_interview_turn_areas_insert_self
  on public.capability_interview_turn_areas
  for insert to authenticated with check (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_interview_turn_areas.turn_id
        and session.user_id = auth.uid()
    )
  );

create policy capability_interview_turn_areas_delete_self
  on public.capability_interview_turn_areas
  for delete to authenticated using (
    exists (
      select 1
      from public.capability_interview_turns turn
      join public.capability_interview_sessions session on session.id = turn.session_id
      where turn.id = capability_interview_turn_areas.turn_id
        and session.user_id = auth.uid()
    )
  );

commit;
