begin;

-- ---------------------------------------------------------------------------
-- Ein Bild, eine Entscheidung
-- ---------------------------------------------------------------------------
--
-- Bisher sah das eigene Profilbild nur die eigene Person. `profiles` ist
-- selbst-only, und die Stellen, die ein fremdes Bild anzeigen wollten - Teams,
-- Verbindungen - fragten die Tabelle vergeblich und zeigten stillschweigend
-- Initialen. In Find gab es ueberhaupt kein Bild.
--
-- WARUM NICHT EIN ZWEITES BILD JE BEREICH:
--   Plattformen trennen nach PUBLIKUM, nicht nach Bereich. Slack hat ein Bild
--   je Workspace, weil dort andere Menschen zusehen. LinkedIn hat EIN Bild und
--   regelt stattdessen, wer es sieht. Niemand verlangt ein zweites Foto fuer
--   denselben Personenkreis - das waere Reibung ohne Gegenwert.
--
--   Align und Find haben dasselbe Publikum: eingeloggte Mitglieder. Also ein
--   Bild und eine Entscheidung. Connect behaelt sein eigenes, weil dort
--   oeffentliche Seiten haengen - das ist der Slack-Fall, und die Trennung
--   dort bleibt unveraendert.
--
-- DIE VOREINSTELLUNG IST "AUS", und das ist wichtig:
--   Ein heute hochgeladenes Bild sieht nur die eigene Person. Es rueckwirkend
--   allen Mitgliedern zu zeigen, waere eine Ausweitung ohne Zustimmung. Wer es
--   zeigen will, schaltet es ein.
-- ---------------------------------------------------------------------------

alter table public.person_core
  add column photo_visible_to_members boolean not null default false;

comment on column public.person_core.photo_visible_to_members is
  'Ob das CoFoundery-Profilbild fuer andere eingeloggte Mitglieder sichtbar ist. Voreinstellung aus - ein bestehendes Bild wird dadurch nicht rueckwirkend geteilt. Gilt nicht fuer Connect: dort haengt an oeffentlichen Seiten eine eigene Einwilligung.';

-- ---------------------------------------------------------------------------
-- Die Bilder, die gezeigt werden duerfen
-- ---------------------------------------------------------------------------
-- Gibt ausschliesslich die Bildangaben zurueck, und nur von Menschen, die
-- zugestimmt haben. Kein Name, keine Bio - wer mehr braucht, hat dafuer eigene
-- Wege, die ihre eigenen Regeln pruefen.
create or replace function public.list_member_photos(p_user_ids uuid[])
returns table (user_id uuid, avatar_id text, avatar_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  return query
  select profile.user_id, profile.avatar_id, profile.avatar_url
  from public.profiles profile
  join public.person_core core on core.user_id = profile.user_id
  where profile.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
    -- Die eigene Person sieht ihr Bild immer; fuer alle anderen zaehlt die
    -- Zustimmung.
    and (profile.user_id = auth.uid() or core.photo_visible_to_members);
end;
$$;

comment on function public.list_member_photos(uuid[]) is
  'Bildangaben von Mitgliedern, die ihr Bild fuer eingeloggte Mitglieder freigegeben haben. Gibt nichts anderes zurueck als die Bildangaben.';

revoke all on function public.list_member_photos(uuid[]) from public, anon;
grant execute on function public.list_member_photos(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Und beim Ausliefern dieselbe Frage
-- ---------------------------------------------------------------------------
-- Die Ausspielroute liefert heute jeder angemeldeten Person jeden gueltigen
-- Pfad aus. Die Pfade sind nicht zu erraten, aber "nicht zu erraten" ist keine
-- Zustimmung - und ein einmal weitergegebener Link liesse sich nie wieder
-- entziehen. Die Route fragt jetzt dieselbe Stelle wie die Anzeige.
create or replace function public.can_read_member_photo(p_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      p_owner_user_id = auth.uid()
      or exists (
        select 1 from public.person_core core
        where core.user_id = p_owner_user_id
          and core.photo_visible_to_members
      )
    );
$$;

comment on function public.can_read_member_photo(uuid) is
  'Darf die aufrufende Person das hochgeladene Bild dieser Person sehen? Eigenes immer, fremdes nur mit Freigabe - damit ein Entzug auch wirkt.';

revoke all on function public.can_read_member_photo(uuid) from public, anon;
grant execute on function public.can_read_member_photo(uuid) to authenticated;

commit;
