begin;

-- ---------------------------------------------------------------------------
-- „Damit bin ich fuer jetzt durch."
-- ---------------------------------------------------------------------------
--
-- „Ueber dich" kennt drei Zustaende je Station: noch offen, begonnen, fuer
-- jetzt fertig. Zwei davon stehen schon in den Fachtabellen - wer eine Zeile
-- hat, hat begonnen; wer ueberall eine Stufe eingetragen hat, ist mit den
-- Stufen durch.
--
-- Fuer drei Bereiche gibt es dieses Ende nicht:
--
--     „Ich habe genug Bereiche eingetragen."
--     „Ich habe genug Staerken benannt."
--     „Mehr Zugaenge habe ich nicht."
--
-- Das sind Aussagen der Person und keine Eigenschaft ihrer Zeilen. Es gibt
-- keine Zahl, ab der es genug ist - 54 Faehigkeitsbereiche sind nicht das
-- Ziel, und drei koennen vollstaendig sein.
--
-- OHNE DIESE TABELLE bliebe dort dauerhaft „begonnen" stehen. Die Seite
-- saegte einer Person also auf unbestimmte Zeit, sie sei mit ihren Staerken
-- noch nicht durch. Das ist nicht „die UX faende es praktisch" - es ist eine
-- Angabe, die es sonst nirgends gibt.
--
-- ---------------------------------------------------------------------------
-- WARUM SIE SO KLEIN IST
-- ---------------------------------------------------------------------------
--
-- Kein `status`, kein Zaehlwert, kein `updated_at`, kein Fortschritt. Alles
-- andere ist aus den Fachtabellen ableitbar, und was ableitbar ist, wird
-- nicht gespeichert - sonst laufen zwei Wahrheiten auseinander.
--
-- Eine Zeile heisst genau eine Sache: Diese Person hat diesen Bereich fuer
-- jetzt als ausreichend markiert. Wer die Markierung zuruecknimmt, loescht
-- die Zeile; es gibt keinen „aufgehobenen" Zustand.
--
-- AENDERUNGEN AN DEN FACHDATEN MACHEN DIE MARKIERUNG NICHT UNGUELTIG. Wer
-- nach dem Markieren eine Staerke ergaenzt, ist nicht ploetzlich wieder
-- „begonnen". „Fuer jetzt fertig" heisst nicht „fuer immer abgeschlossen",
-- und ein Profil, das sich beim Pflegen selbst zurueckstuft, bestraft das
-- Pflegen.
--
-- `section` ist bewusst freier Text und keine Aufzaehlung in der Datenbank:
-- Die gueltigen Kennungen stehen im Code (`features/profile/aboutYou.ts`),
-- weil sie zur Oberflaeche gehoeren und sich mit ihr aendern. Eine unbekannte
-- Kennung wird beim Lesen ignoriert; sie kostet eine Zeile und sonst nichts.
-- ---------------------------------------------------------------------------

create table public.person_section_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null,
  marked_at timestamptz not null default now(),
  primary key (user_id, section),
  constraint person_section_marks_section_check check (
    char_length(btrim(section)) between 1 and 60
  )
);

comment on table public.person_section_marks is
  'Eine Zeile heisst: Die Person hat diesen Bereich von "Ueber dich" fuer jetzt '
  'als ausreichend markiert. Kein Status, kein Fortschritt - ein Zeitpunkt.';

alter table public.person_section_marks enable row level security;

-- Ausschliesslich eigene Zeilen. Es gibt keinen Weg, an dem jemand anders die
-- Markierung einer Person sehen oder setzen koennte: Sie ist eine Notiz an
-- sich selbst und keine Auskunft ueber einen Menschen.
create policy person_section_marks_select_self on public.person_section_marks
  for select to authenticated using (user_id = auth.uid());
create policy person_section_marks_insert_self on public.person_section_marks
  for insert to authenticated with check (user_id = auth.uid());
create policy person_section_marks_delete_self on public.person_section_marks
  for delete to authenticated using (user_id = auth.uid());

-- KEIN UPDATE, und das ist kein Versehen. Die Zeile hat ausser ihrem
-- Schluessel nur den Zeitpunkt, und es gibt keinen Fall, in dem der sich
-- aendern muesste: Eine vorhandene Markierung sagt bereits, was eine zweite
-- sagen wuerde. Das Setzen laeuft deshalb als `on conflict do nothing`.

commit;
