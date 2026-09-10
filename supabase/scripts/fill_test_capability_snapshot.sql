-- ---------------------------------------------------------------------------
-- Einmalskript: Capability-Snapshot eines Testkontos fuellen
-- ---------------------------------------------------------------------------
--
-- Zweck: dem Vergleich eine zweite Seite geben, damit sich die abgeleiteten
-- Zustaende ueberhaupt zeigen koennen.
--
-- BEWUSST KEINE MIGRATION. Das hier sind Daten, keine Schemaaenderung; als
-- Migration wuerde es in jeder Umgebung mitlaufen und dort auf eine
-- E-Mail-Adresse verweisen, die es nicht gibt. Es liegt auch nicht in
-- seed.sql, weil das bei jedem lokalen `db reset` ausgefuehrt wird.
--
-- ERFUNDENE TESTDATEN. Die Eintraege unten beschreiben niemanden; sie sind so
-- gewaehlt, dass gegen ein echtes Profil moeglichst viele der Zustaende
-- entstehen - doppelter Anspruch, offene Stelle, planbarer Weg, sitzt schon,
-- gewollt ohne Tiefe und ausdruecklich auch "keine Grundlage".
--
-- WAS DIESES SKRIPT NICHT TUT:
--   * Es legt kein Connect-Profil an. Das Testkonto braucht ein aktives
--     Connect-Profil (fuer den Namen und fuer die Freigabepruefung) - das
--     entsteht in der App, mit den dortigen Pflichtfeldern.
--   * Es legt keine Verbindung an. Eine Kontaktanfrage haengt an einer
--     Anzeige und traegt Snapshot-Felder; das gehoert durch den echten
--     Ablauf, nicht durch ein Skript.
--   * Es aendert nichts an deinem eigenen Konto. Deine Freigabestufe setzt
--     du selbst auf /profile - das ist eine Entscheidung, kein Setup.
--
-- AUSFUEHREN: im Supabase-SQL-Editor einfuegen und laufen lassen. Es ist
-- wiederholbar; ein zweiter Lauf aktualisiert dieselben Zeilen statt zu
-- verdoppeln. Zum Entfernen der Block am Dateiende.
-- ---------------------------------------------------------------------------

begin;

do $$
declare
  test_email constant text := 'info@mia-fotografiert.de';
  test_user_id uuid;
  written integer;
begin
  select id into test_user_id from auth.users where lower(email) = lower(test_email);

  -- Laut abbrechen statt still nichts tun: Ein Skript, das scheinbar
  -- durchlaeuft und nichts geschrieben hat, ist schlimmer als ein Fehler.
  if test_user_id is null then
    raise exception 'Kein Konto mit der Adresse % gefunden. Erst in der App registrieren.', test_email;
  end if;

  -- person_core existiert durch den Trigger aus 20260907120000 schon; die
  -- Zeile hier ist nur die Absicherung fuer Konten, die davor entstanden sind.
  insert into public.person_core (user_id) values (test_user_id)
  on conflict (user_id) do nothing;

  -- Ohne diese Stufe liefert get_disclosed_capability keine Tiefe, und der
  -- Vergleich haette auf dieser Seite ueberall "keine Grundlage".
  update public.person_core
  set capability_disclosure = 'areas_depth_on_contact'
  where user_id = test_user_id;

  -- Die Eintraege. Aufbau: ein technisch gepraegtes Profil, das zu einem
  -- produkt- oder vertriebsgepraegten Profil moeglichst viele verschiedene
  -- Zustaende erzeugt.
  insert into public.person_capability_entries (user_id, area_id, application_level, ownership_wish)
  values
    -- Tiefe und will es behalten -> "sitzt schon", oder doppelter Anspruch,
    -- wenn die andere Seite denselben Bereich beansprucht.
    (test_user_id, 'software_engineering',   5, 'own'),
    (test_user_id, 'technical_architecture', 5, 'own'),
    (test_user_id, 'data_analytics',         4, 'own'),

    -- Kann es, will es nicht dauerhaft verantworten. Trifft auf einen
    -- Anspruch der anderen Seite, wird daraus ein planbarer Weg.
    (test_user_id, 'product_management',     4, 'prefer_other'),
    (test_user_id, 'process_design',         4, 'prefer_other'),

    -- Mitarbeit ohne Anspruch.
    (test_user_id, 'ai_ml',                  4, 'contribute'),

    -- Will hineinwachsen, noch ohne Tiefe -> "gewollt, aber ohne Tiefe",
    -- solange die andere Seite dort auch keine Tiefe hat.
    (test_user_id, 'fundraising',            2, 'grow_into'),
    (test_user_id, 'pricing',                1, 'grow_into'),

    -- Ausdrueckliche Absagen -> offene Stelle, wenn die andere Seite auch
    -- absagt.
    (test_user_id, 'b2b_sales',              2, 'prefer_other'),
    (test_user_id, 'marketing_brand',        1, 'prefer_external'),

    -- Absichtlich unentschieden. Muss "keine Grundlage" ergeben und nicht
    -- als Absage gelesen werden.
    (test_user_id, 'security',               3, 'unclear'),

    -- Wunsch ohne Stufe. Auch das darf keine Aussage ueber Erfahrung werden.
    (test_user_id, 'data_protection',     null, 'own')
  on conflict (user_id, area_id) do update
  set application_level = excluded.application_level,
      ownership_wish = excluded.ownership_wish,
      updated_at = now();

  select count(*) into written
  from public.person_capability_entries
  where user_id = test_user_id;

  raise notice 'Testkonto % gefuellt: % Eintraege, Freigabe auf areas_depth_on_contact.',
    test_email, written;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Rueckbau: entfernt genau das, was oben entstanden ist.
-- ---------------------------------------------------------------------------
-- begin;
-- do $$
-- declare
--   test_user_id uuid;
-- begin
--   select id into test_user_id from auth.users
--   where lower(email) = lower('info@mia-fotografiert.de');
--   if test_user_id is null then
--     raise exception 'Konto nicht gefunden.';
--   end if;
--   delete from public.person_capability_entries where user_id = test_user_id;
--   update public.person_core set capability_disclosure = 'private'
--   where user_id = test_user_id;
-- end $$;
-- commit;
