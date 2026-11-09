-- Mitteilungen: "Zeigen ab" und "Zeigen bis" gelten ab jetzt als Tage in BERLINER Zeit.
--
-- Wunsch von Maria (09.11.2026). Bisher legte das Formular die Grenzen auf 00:00 und 23:59:59 UTC - in Berlin also 1 bis 2
-- Stunden spaeter (Winter 01:00, Sommer 02:00). Jetzt beginnt eine Mitteilung um 0 Uhr Berliner Zeit und endet um 23:59:59
-- Berliner Zeit; Sommer- und Winterzeit stellen sich von selbst um (das macht die Zeitzone, nicht eine feste Verschiebung).
--
-- Bestehende Mitteilungen: Was das Formular als Tagesgrenze in UTC geschrieben hat (genau 00:00:00 bzw. 23:59:59 UTC),
-- wird auf denselben Kalendertag in Berliner Zeit gelegt. Alles andere bleibt unberuehrt.

begin;

update public.platform_announcements
   set starts_at = ((starts_at at time zone 'UTC')::date)::timestamp at time zone 'Europe/Berlin'
 where starts_at is not null
   and (starts_at at time zone 'UTC')::time = time '00:00:00';

update public.platform_announcements
   set ends_at = ((ends_at at time zone 'UTC')::date + time '23:59:59') at time zone 'Europe/Berlin'
 where ends_at is not null
   and (ends_at at time zone 'UTC')::time = time '23:59:59';

commit;
