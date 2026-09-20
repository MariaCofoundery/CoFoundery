begin;

-- ---------------------------------------------------------------------------
-- Vorstellungsanfragen aus Find loesen jetzt eine Benachrichtigung aus
-- ---------------------------------------------------------------------------
--
-- DIE LUECKE: Eine Vorstellungsanfrage war der einzige Vorgang im Produkt, bei
-- dem sich jemand persoenlich an eine andere Person wendet und diese davon
-- NICHTS erfaehrt - keine Mail, keine Mitteilung, nur ein Zaehler in der
-- Leiste, den man sieht, wenn man ohnehin da ist. Wer nicht taeglich
-- hereinschaut, laesst jemanden wochenlang warten, ohne es zu wissen.
--
-- ZWEI ARTEN, UND EINE BEWUSST NICHT:
--
--   discovery_intro_request  - jemand moechte dich kennenlernen.
--   discovery_intro_accepted - deine Anfrage wurde angenommen. Ohne diese
--                              Nachricht erfaehrt die anfragende Person es nur,
--                              wenn sie von sich aus nachsieht - und das
--                              Gespraech, das sich damit oeffnet, bliebe leer.
--
--   Eine Absage wird NICHT verschickt. Sie steht in der Liste und ist dort zu
--   sehen; eine Mail darueber macht aus einem stillen Nein eine Zustellung ins
--   Postfach. Wer angefragt hat, soll es erfahren, wenn er hinsieht - nicht,
--   wenn er gerade an etwas anderem arbeitet.
-- ---------------------------------------------------------------------------

alter table public.network_notification_claims
  drop constraint network_notification_claims_kind_check;

alter table public.network_notification_claims
  add constraint network_notification_claims_kind_check
    check (kind in (
      'contact_request',
      'problem_interest',
      'approach_interest',
      'message',
      'discovery_intro_request',
      'discovery_intro_accepted'
    ));

alter table public.notification_opt_outs
  drop constraint notification_opt_outs_kind_check;

alter table public.notification_opt_outs
  add constraint notification_opt_outs_kind_check
    check (kind in (
      'contact_request',
      'message',
      'problem_interest',
      'connect_saved_search',
      'discovery_saved_search',
      'read_my_mind',
      'founder_in_the_wild',
      'discovery_intro_request',
      'discovery_intro_accepted'
    ));

-- ---------------------------------------------------------------------------
-- Ein Schalter, der nicht schaltete
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 20.09.2026 beim Nachbauen der Liste: `approach_interest` gibt es
-- als Benachrichtigungsart (eigene Mail, eigener Anspruch), aber NICHT in
-- `notification_opt_outs_kind_check`. Eine Abbestellung dafuer liesse sich gar
-- nicht speichern - `wants_email_notification('approach_interest')` gab damit
-- immer true zurueck.
--
-- Wer "Interesse an einem deiner Probleme" abgewaehlt hat, bekam also weiter
-- Post, sobald sich jemand zu einem ANSATZ meldete. Der Text des Schalters
-- verspricht genau das Gegenteil: "Wenn jemand sagt, dass er das Problem auch
-- kennt oder einen Ansatz dazu hat."
--
-- Behoben wird es an der Stelle, an der gefragt wird, und nicht durch einen
-- achten Schalter: Beide Faelle sind dieselbe Sache aus zwei Richtungen -
-- jemand meldet sich zu etwas, das du geschrieben hast. Der Unterschied liegt
-- nur im Text der Mail, damit sie nicht das Falsche behauptet.
create or replace function public.wants_email_notification(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and not exists (
    select 1 from public.notification_opt_outs opt_out
    where opt_out.user_id = p_user_id
      and opt_out.kind = case
        -- Arten ohne eigenen Schalter haengen an dem, unter dem sie in den
        -- Einstellungen beschrieben sind.
        when p_kind = 'approach_interest' then 'problem_interest'
        else p_kind
      end
  );
$$;

comment on function public.wants_email_notification(uuid, text) is
  'Ob diese Person diese Benachrichtigungsart bekommen moechte. Gibt true zurueck, solange keine Abbestellung vorliegt - auch fuer eine Art, die es beim Anlegen der Zeile noch nicht gab. Gilt ueber claim_network_notification fuer BEIDE Wege: Mail und Mitteilung auf das Geraet. approach_interest haengt am Schalter von problem_interest, weil der Text dieses Schalters beide Faelle nennt. Der Name stammt aus der Zeit, als es nur den einen Weg gab.';

commit;
