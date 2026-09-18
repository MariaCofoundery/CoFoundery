begin;

-- ---------------------------------------------------------------------------
-- Der erste Weg fuehrt jetzt in drei Bereiche, nicht in einen
-- ---------------------------------------------------------------------------
--
-- Bisher fiel die Entscheidung "was hast du vor" auf /start - neben dem
-- E-Mail-Feld und dem Beta-Code, bevor irgendjemand irgendetwas vom Produkt
-- gesehen hatte. Sie fiel dort, weil sie dort fallen MUSSTE: Wer nur ins
-- Netzwerk wollte, brauchte einen Token, der an die E-Mail gebunden war,
-- damit der Callback die Mitgliedschaft ohne Rolle anlegen konnte.
--
-- Diese Migration nimmt dem Anmeldeformular diesen Zwang ab. Danach kann die
-- Frage dorthin, wo sie hingehoert: hinter den Magic Link, wo man Ruhe hat.
--
-- Zwei Dinge, mehr nicht.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Dem Netzwerk beitreten, ohne Founder zu werden
-- ---------------------------------------------------------------------------
--
-- Founder und Advisors werden automatisch Mitglied - das erledigt der Trigger
-- ensure_network_membership_for_product_role auf profiles.roles. Fuer alle
-- anderen gab es diesen Weg bisher nur ueber den Token beim Anmelden.
--
-- WARUM NICHT EINFACH EINE ZEILE IN profiles SCHREIBEN:
--   profiles.roles hat `default '{founder}'`. Eine profiles-Zeile anzulegen,
--   um "keine Rolle" auszudruecken, macht die Person zur Founderin. Genau
--   deshalb haben Connect-only-Konten bis heute bewusst GAR KEINE
--   profiles-Zeile (siehe Kommentar in 20260907120000_create_person_core_v01).
--   Der Beitritt bekommt deshalb seinen eigenen, engen Weg.
--
-- WARUM on conflict do nothing UND KEIN UPDATE:
--   status kennt 'suspended'. Ein UPDATE auf 'active' waere eine Tuer, durch
--   die sich eine gesperrte Person selbst wieder hereinlaesst. Wer schon eine
--   Zeile hat, behaelt sie unveraendert - der Aufruf ist dann folgenlos.
create or replace function public.join_network_as_member()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.network_memberships(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  return public.is_network_member(v_user_id);
end;
$$;

comment on function public.join_network_as_member() is
  'Legt fuer die aufrufende Person eine Netzwerkmitgliedschaft an, ohne ihr eine Produktrolle zu geben. Idempotent und ohne Reaktivierung: Eine bestehende - auch gesperrte - Mitgliedschaft bleibt unveraendert. Gibt zurueck, ob danach eine aktive Mitgliedschaft besteht.';

revoke all on function public.join_network_as_member() from public, anon;
grant execute on function public.join_network_as_member() to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Ob jemand schon eingefuehrt wurde
-- ---------------------------------------------------------------------------
--
-- Fuer Founder und Advisors beantwortet isCoreProfileComplete diese Frage
-- nebenbei: Wer die vier Kernangaben hat, war da. Fuer Menschen ohne
-- Produktrolle gab es die Frage bisher nicht - sie sind schlicht nie
-- eingefuehrt worden, /welcome war fuer sie nicht vorgesehen.
--
-- Ohne eine eigene Markierung muesste die Weiche raten. Das naechstbeste
-- Signal waere "ist das Connect-Profil schon aktiv" gewesen - dann bekaeme
-- aber jede Person, die den Einstieg abbricht und spaeter wiederkommt, die
-- Einfuehrung erneut, und zwar bei jeder Anmeldung bis sie fertig ist.
--
-- Der Zeitpunkt statt eines Schalters: Er beantwortet zusaetzlich "seit wann"
-- und kostet nichts.
alter table public.person_core
  add column onboarding_completed_at timestamptz;

comment on column public.person_core.onboarding_completed_at is
  'Wann die Person den Einstieg abgeschlossen hat. Steuert ausschliesslich, ob /welcome noch gezeigt wird. Null heisst "noch nicht eingefuehrt", nicht "Profil unvollstaendig" - dafuer gibt es isCoreProfileComplete.';

-- Alle, die es heute schon gibt, gelten als eingefuehrt.
--
-- Das ist der wichtigste Teil dieser Migration: Ohne diesen Backfill wuerde
-- die laufende Beta beim naechsten Login in einen Einstiegsweg gezogen, den
-- diese Menschen nicht brauchen. Eine Einfuehrung, die man ein zweites Mal
-- bekommt, ist keine Einfuehrung, sondern eine Sperre.
update public.person_core
set onboarding_completed_at = coalesce(created_at, now())
where onboarding_completed_at is null;

commit;
