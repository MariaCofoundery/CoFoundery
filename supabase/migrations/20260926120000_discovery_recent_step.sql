begin;

-- ---------------------------------------------------------------------------
-- Der letzte Schritt
-- ---------------------------------------------------------------------------
--
-- Der beste Hinweis auf Bereitschaft ist nicht, was jemand vorhat, sondern was
-- er zuletzt getan hat. Absichten sind gratis; ein Schritt ist passiert.
--
-- DREI DINGE, DIE DIESE FRAGE KAPUTT MACHEN WUERDEN, und was dagegen steht:
--
--   Ein Lebenslauf. "Zehn Jahre Erfahrung in..." beantwortet die Frage nicht.
--   Dagegen hilft die Kuerze: 280 Zeichen sind kein Werdegang. Und die Frage
--   fragt nach DEM LETZTEN Schritt, in der Einzahl.
--
--   Eine Buehne. Wer glaubt, hier Leistung zeigen zu muessen, schreibt
--   "taeglich drei Stunden am Pitch Deck". Dagegen hilft das Beispiel im
--   Platzhalter: ein Gespraech, eine Absage, ein verworfener Entwurf.
--
--   Scham. Wer nichts geschafft hat, soll nicht das Gefuehl haben, hier
--   durchzufallen. Deshalb ist das Feld freiwillig, und der Hinweis sagt
--   ausdruecklich, dass ein leeres Feld nichts ueber die Ernsthaftigkeit sagt.
--
-- Bewusst kein Datumsfeld daneben. Die Zeit steht im Satz, wenn sie wichtig
-- ist ("Im August habe ich..."), und ein zweites Pflichtfeld fuer eine
-- freiwillige Angabe waere eine Huerde ohne Gegenwert.
-- ---------------------------------------------------------------------------

alter table public.founder_discovery_profiles
  add column recent_step text,
  add constraint founder_discovery_profiles_recent_step_check
    check (recent_step is null or char_length(btrim(recent_step)) between 20 and 280);

comment on column public.founder_discovery_profiles.recent_step is
  'Was die Person zuletzt in Richtung Gruendung getan hat. Freiwillig, kurz gehalten - ein Schritt, kein Werdegang. Steht nur auf der Profilseite, nicht auf der Karte.';

commit;
