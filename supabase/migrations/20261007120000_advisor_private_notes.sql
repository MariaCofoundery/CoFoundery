begin;

-- ---------------------------------------------------------------------------
-- Die Notizen des Advisors - seine eigenen, von niemandem sonst lesbar
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE: Ein Advisor konnte bisher genau eine Sache schreiben - Impulse
-- pro Report-Abschnitt. Die sind an die Abschnitte gebunden UND fuer die
-- Founder sichtbar. Wer beruflich begleitet, fuehrt aber Notizen: was beim
-- letzten Termin aufgefallen ist, was er beim naechsten ansprechen will, was
-- er noch nicht sagen kann. Das musste bisher in ein anderes Werkzeug, getrennt
-- von dem Material, auf das es sich bezieht.
--
-- WARUM DIESE TABELLE EINE POLICY HAT UND `advisor_section_impulses` NICHT:
--   Bei den Impulsen entscheidet die Zustimmung BEIDER Founder, wer was sehen
--   darf - das laesst sich nicht in einer Policy ausdruecken, ohne die halbe
--   Freigabelogik zu duplizieren, und laeuft deshalb ueber enge Serverpfade.
--
--   Hier ist die Regel dagegen so einfach, dass die Datenbank sie selbst halten
--   kann: Es gehoert der Person, die es geschrieben hat. Niemand sonst, in
--   keiner Richtung, unter keiner Bedingung. Damit braucht die Anwendung hier
--   KEINEN privilegierten Zugang - und ein Fehler in der Anwendung kann die
--   Notizen nicht herausgeben.
--
-- WARUM SIE EINEN WIDERRUF UEBERLEBEN:
--   Wenn die Founder die Freigabe beenden, verliert der Advisor den Zugang zu
--   IHREN Inhalten - Report, Snapshot, Setup-Staende. Seine eigenen Notizen
--   sind das nicht. Sie sind seine Arbeit an einem Mandat, das stattgefunden
--   hat, und sie waren nie fuer die Founder sichtbar. Eine Beraterin behaelt
--   ihre Handakte, wenn das Mandat endet.
--
--   Was NICHT ueberlebt: das Loeschen eines Kontos. Die Notizen haengen per
--   `on delete cascade` an der Beziehung; verschwindet die, verschwinden sie
--   mit. Personenbezogene Aufzeichnungen ueber jemanden, der sein Konto
--   geloescht hat, darf niemand behalten.
--
-- EINE NOTIZ JE TEAM, nicht je Sitzung:
--   Sitzungen gibt es in diesem Produkt nicht als Gegenstand. Sie zu erfinden,
--   nur um Notizen zu datieren, waere ein Modell fuer eine Funktion statt
--   umgekehrt. Wer datieren will, schreibt ein Datum in den Text; wenn sich
--   zeigt, dass das nicht reicht, ist der naechste Schritt eine echte
--   Sitzungsliste.
-- ---------------------------------------------------------------------------

create table public.advisor_private_notes (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  advisor_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_private_notes_body_check check (char_length(body) <= 20000),
  unique (relationship_id, advisor_user_id)
);

comment on table public.advisor_private_notes is
  'Private Arbeitsnotizen eines Advisors zu einem begleiteten Team. Ausschliesslich fuer die schreibende Person lesbar - auch die Founder sehen sie nicht. Ueberlebt einen Widerruf der Freigabe, nicht aber das Loeschen eines beteiligten Kontos.';

create index advisor_private_notes_advisor_idx
  on public.advisor_private_notes (advisor_user_id, updated_at desc);

alter table public.advisor_private_notes enable row level security;

-- Genau eine Regel, in alle vier Richtungen dieselbe: die eigene Zeile.
create policy advisor_private_notes_owner_select
  on public.advisor_private_notes for select
  using (advisor_user_id = auth.uid());

create policy advisor_private_notes_owner_insert
  on public.advisor_private_notes for insert
  with check (advisor_user_id = auth.uid());

create policy advisor_private_notes_owner_update
  on public.advisor_private_notes for update
  using (advisor_user_id = auth.uid())
  with check (advisor_user_id = auth.uid());

create policy advisor_private_notes_owner_delete
  on public.advisor_private_notes for delete
  using (advisor_user_id = auth.uid());

create or replace function public.set_advisor_private_notes_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_advisor_private_notes_set_updated_at
before update on public.advisor_private_notes
for each row
execute function public.set_advisor_private_notes_updated_at();

-- ---------------------------------------------------------------------------
-- Das Follow-up wird eine Verabredung statt einer Beschriftung
-- ---------------------------------------------------------------------------
-- Im Workbook gibt es seit langem eine Angabe "Follow-up in 4 Wochen / 3
-- Monaten". Sie stand als Text im Advisor-Dashboard und hat nie etwas getan -
-- niemand wurde erinnert. Hier bekommt sie ein Datum, damit daraus eine
-- Faelligkeit werden kann.
--
-- Bewusst beim Advisor und nicht beim Team: Es ist SEINE Verabredung mit sich
-- selbst. Die Founder bekommen davon nichts zu sehen und nichts zugeschickt.
create table public.advisor_follow_ups (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  advisor_user_id uuid not null references auth.users (id) on delete cascade,
  due_on date not null,
  note text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_follow_ups_note_check check (char_length(note) <= 2000),
  unique (relationship_id, advisor_user_id)
);

comment on table public.advisor_follow_ups is
  'Wiedervorlage eines Advisors zu einem begleiteten Team. Seine eigene Verabredung - die Founder sehen sie nicht und werden nicht benachrichtigt.';

create index advisor_follow_ups_due_idx
  on public.advisor_follow_ups (advisor_user_id, due_on)
  where completed_at is null;

alter table public.advisor_follow_ups enable row level security;

create policy advisor_follow_ups_owner_select
  on public.advisor_follow_ups for select
  using (advisor_user_id = auth.uid());

create policy advisor_follow_ups_owner_insert
  on public.advisor_follow_ups for insert
  with check (advisor_user_id = auth.uid());

create policy advisor_follow_ups_owner_update
  on public.advisor_follow_ups for update
  using (advisor_user_id = auth.uid())
  with check (advisor_user_id = auth.uid());

create policy advisor_follow_ups_owner_delete
  on public.advisor_follow_ups for delete
  using (advisor_user_id = auth.uid());

create trigger trg_advisor_follow_ups_set_updated_at
before update on public.advisor_follow_ups
for each row
execute function public.set_advisor_private_notes_updated_at();

commit;
