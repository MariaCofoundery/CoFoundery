begin;

-- ---------------------------------------------------------------------------
-- Ein Gespraech hat eine Art
-- ---------------------------------------------------------------------------
--
-- SCHRITT S1 aus `web/docs/direction-interview-technical-brief.md`.
--
-- Die Gespraechsmechanik - Fragen stellen, Antworten speichern, Entwuerfe
-- retten, pausieren, abschliessen - ist fuer jeden Interviewtyp dieselbe. Was
-- sich unterscheidet, ist der Fragenkatalog und das Ziel der Auswertung.
-- Deshalb bekommen die beiden vorhandenen Tabellen eine Spalte und keinen
-- Zwilling.
--
-- DIE TABELLEN BEHALTEN IHRE NAMEN. Ein `capability_interview_turns`, in dem
-- auch Direction-Zeilen liegen, ist ein unschoener Name - aber ein Name ist
-- billiger als ein Umzug von Zeilen durch zwanzig Policies, drei Funktionen
-- (`get_ai_job_source_text` nennt die Tabelle namentlich) und sechzehn
-- Testdateien. Die Kommentare an den Tabellen sagen es.
--
-- DIE POLICIES BLEIBEN UNVERAENDERT. Sie pruefen `user_id = auth.uid()`, und
-- das gilt fuer jede Art. Ein Interview ueber die eigenen Staerken oder die
-- eigenen Antriebe ist in beiden Faellen das Gegenteil von etwas, das jemand
-- anders einsehen darf.
--
-- KEINE DATENWANDERUNG: Der Vorgabewert 'capability' gibt den vorhandenen
-- Zeilen genau die Bedeutung, die sie schon haben.
-- ---------------------------------------------------------------------------

alter table public.capability_interview_sessions
  add column kind text not null default 'capability';

alter table public.capability_interview_sessions
  add constraint capability_interview_sessions_kind_check
  check (kind in ('capability', 'direction'));

-- EIN AKTIVES GESPRAECH JE PERSON UND ART, nicht je Person.
--
-- Der alte Index liess nur EIN aktives Gespraech zu. Damit haette das Starten
-- eines Direction-Interviews an einem laufenden Capability-Interview
-- scheitern muessen - und das waere die falsche Antwort: Es sind zwei
-- Perspektiven, nicht zwei Versuche derselben Sache.
--
-- Zwei Gespraeche DERSELBEN Art bleiben verboten. Zwei Verlaeufe, die sich
-- beide als "das Interview" ausgeben, und beim Fortsetzen entscheidet der
-- Zufall.
drop index public.capability_interview_sessions_one_active;

create unique index capability_interview_sessions_one_active
  on public.capability_interview_sessions (user_id, kind)
  where status = 'active';

comment on table public.capability_interview_sessions is
  'Ein gefuehrtes Gespraech. `kind` sagt, welches: capability (Faehigkeiten, erzeugt Evidenz in person_capability_evidence) oder direction (Antriebe, erzeugt bestaetigte Aussagen). Der Tabellenname ist aelter als die Spalte.';

-- ---------------------------------------------------------------------------
-- Die Art steht auch an der Zeile - und kann nicht widersprechen
-- ---------------------------------------------------------------------------
--
-- WARUM DENORMALISIERT: Ohne die Spalte an der Zeile liesse sich die Regel
-- unten nicht schreiben ("eine Direction-Antwort traegt keine
-- Capability-Evidenz"), denn ein Check-Constraint kann keine andere Tabelle
-- lesen. Und jede Abfrage auf Zeilen einer Art muesste ueber die Sitzung
-- gehen.
--
-- UND WARUM DAS TROTZDEM SICHER IST: Ein zusammengesetzter Fremdschluessel
-- auf (id, kind) der Sitzung macht einen Widerspruch unmoeglich - eine Zeile
-- mit kind='direction' kann nur an einer Sitzung mit kind='direction' haengen.
-- Das ist der Unterschied zwischen einer Kopie, die auseinanderlaeuft, und
-- einer, die es nicht kann.
alter table public.capability_interview_sessions
  add constraint capability_interview_sessions_id_kind_unique unique (id, kind);

alter table public.capability_interview_turns
  add column kind text not null default 'capability';

alter table public.capability_interview_turns
  add constraint capability_interview_turns_session_kind_fkey
  foreign key (session_id, kind)
  references public.capability_interview_sessions (id, kind)
  on delete cascade;

-- EVIDENZ GEHOERT ZU CAPABILITY. Eine Direction-Antwort wird nicht zu einem
-- Eintrag im Faehigkeitsvokabular - dort gibt es keinen Bereich, auf den
-- "mich treibt an, komplizierte Systeme verstaendlicher zu machen" zeigen
-- koennte. Ohne diese Regel waere der einzige Schutz davor, dass es der Code
-- nicht tut.
alter table public.capability_interview_turns
  add constraint capability_interview_turns_evidence_is_capability
  check (kind = 'capability' or evidence_id is null);

comment on table public.capability_interview_turns is
  'Gestellte Frage und gegebene Antwort, in der Reihenfolge des Gespraechs. `kind` folgt der Sitzung und kann ihr nicht widersprechen (zusammengesetzter Fremdschluessel). Enthaelt nichts Verborgenes: kein Gedankengang eines Modells, keine Zwischenbewertung, keine Tonaufnahme.';

commit;
