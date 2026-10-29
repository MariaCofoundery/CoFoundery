begin;

-- ---------------------------------------------------------------------------
-- Neue Vorschlaege: gesehen oder nicht
-- ---------------------------------------------------------------------------
--
-- Die Zahl an "Connect" in der Navigation soll NEUE Vorschlaege zeigen, nicht
-- alle offenen. Sonst bliebe sie stehen, bis jemand jeden einzeln wegklickt,
-- und hiesse nach kurzer Zeit "nicht beachten".
--
-- `seen_at` wird gesetzt, wenn die Person die Vorschlagsliste geoeffnet hat.
-- Der Streifen auf der Startseite zaehlt nicht: Er nennt nur die Anzahl und
-- zeigt keinen Vorschlag.
--
-- Es entsteht keine neue Information ueber die Person - gespeichert wird nur,
-- ob sie einen Vorschlag schon gesehen hat. Die Zeile gehoert ihr
-- (RLS: recipient_user_id = auth.uid()), und sie wird mit dem Konto geloescht.
--
-- Vorhandene Vorschlaege gelten als gesehen: Zum Start soll niemand eine Zahl
-- fuer Dinge bekommen, die schon lange daliegen.
-- ---------------------------------------------------------------------------

alter table public.connect_suggestions
  add column seen_at timestamptz;

update public.connect_suggestions
   set seen_at = now()
 where seen_at is null;

create index connect_suggestions_unseen_idx
  on public.connect_suggestions (recipient_user_id)
  where dismissed_at is null and seen_at is null;

comment on column public.connect_suggestions.seen_at is
  'Wann die Person die Vorschlagsliste mit diesem Vorschlag geoeffnet hat. NULL = neu. Steuert nur die Zahl in der Navigation.';

commit;
