begin;

-- Der avatars-Bucket war `public = true` mit der Policy
-- `avatars_public_read ... using (bucket_id = 'avatars')`. Damit war jede
-- hochgeladene Datei ohne Login per Direkt-URL abrufbar.
--
-- Das war Sicherheit durch Unauffindbarkeit: Die Pfade enthalten einen
-- Zufalls-UUID und sind nicht durchprobierbar, aber wer eine URL einmal hat,
-- behaelt den Zugriff dauerhaft - aus Browserverlauf, Screenshot, Proxy-Log.
-- Widerrufen ging nur durch Loeschen der Datei.
--
-- Bestandsdateien bleiben unberuehrt: keine Datei wird verschoben, kein
-- avatar_url-Wert geaendert. Es wird nur der anonyme Zugriff geschlossen und
-- die Auslieferung hinter eine authentifizierte Route gelegt.
--
-- Die Bibliotheks-Illustrationen liegen nicht in diesem Bucket, sondern als
-- statische Seitendateien unter /avatars/library/. Sie sind bei allen Nutzern
-- dieselben und verraten ueber niemanden etwas.

update storage.buckets set public = false where id = 'avatars';

drop policy if exists avatars_public_read on storage.objects;

-- Angemeldete Personen duerfen Profilbilder lesen. Das entspricht dem, was das
-- Produkt heute ohnehin zeigt - Bilder erscheinen in Discovery, Connect und
-- Teams fuer eingeloggte Nutzer.
--
-- Bewusst offen gelassen: eine Verengung auf "nur wer denselben Kontext
-- teilt". Die gibt es fuer Connect-Fotos schon (can_read_network_profile_photo).
-- Sie hier nachzuziehen ist ein eigener Schritt und keine Voraussetzung dafuer,
-- den anonymen Zugriff zu schliessen.
create policy avatars_authenticated_read on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');

commit;
