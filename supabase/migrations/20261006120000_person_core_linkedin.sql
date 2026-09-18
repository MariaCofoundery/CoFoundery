begin;

-- ---------------------------------------------------------------------------
-- Ein LinkedIn-Profil, und die Entscheidung, wer es sieht
-- ---------------------------------------------------------------------------
--
-- Eine Spalte `linkedin_url` gab es schon - auf `profiles`, aus der Zeit des
-- LinkedIn-Imports, der laengst entfernt ist. Sie wurde nirgends eingegeben und
-- nirgends angezeigt: toter Speicher mit lebendigem Inhalt, denn wer den Import
-- damals ausgefuehrt hat, hat dort einen Wert stehen.
--
-- Der Kern ist heute `person_core`. Dorthin gehoert die Angabe, weil sie eine
-- Eigenschaft des Menschen ist und nicht eines Bereichs - genau wie Name,
-- Headline und Bild.
--
-- WARUM EINE VIERSTUFIGE SICHTBARKEIT UND KEIN HAEKCHEN:
--   Ein LinkedIn-Profil ist der Klarname plus Lebenslauf plus Netzwerk. Wer es
--   einer Person zeigen will, mit der sie ohnehin schon spricht, will es damit
--   nicht auf eine von Suchmaschinen gelesene Seite stellen. Das sind vier
--   verschiedene Publika, also vier Stufen - und zu jeder steht in der
--   Oberflaeche, was sie bedeutet.
--
-- DIE VOREINSTELLUNG IST "private", UND DAS IST DER PUNKT:
--   Die Altwerte aus dem Import werden uebernommen, damit niemand seine Angabe
--   verliert. Sie einer Stufe zuzuordnen, die sie jemandem zeigt, waere eine
--   Ausweitung der Sichtbarkeit ohne Zustimmung - die Menschen haben den Link
--   eingetragen, als ihn nichts anzeigte. Also liegt er zunaechst still da, und
--   wer ihn zeigen will, waehlt eine Stufe.
-- ---------------------------------------------------------------------------

alter table public.person_core
  add column linkedin_url text,
  add column linkedin_visibility text not null default 'private';

alter table public.person_core
  add constraint person_core_linkedin_visibility_check
    check (linkedin_visibility in ('private', 'contacts', 'members', 'public'));

-- Nur https und nur LinkedIn. Ein freies Linkfeld im Profil waere ein Weg,
-- beliebige Adressen an andere Mitglieder auszuspielen; danach wurde nicht
-- gefragt. Die Pruefung steht zusaetzlich in der Anwendung - hier steht sie,
-- damit sie auch fuer alles gilt, was nicht durch das Formular kommt.
alter table public.person_core
  add constraint person_core_linkedin_url_check
    check (
      linkedin_url is null
      or linkedin_url ~ '^https://([a-z0-9-]+\.)*linkedin\.com/[^[:space:]]*$'
    );

comment on column public.person_core.linkedin_url is
  'Das LinkedIn-Profil der Person. Nur https und nur linkedin.com. Wer es sieht, entscheidet linkedin_visibility.';

comment on column public.person_core.linkedin_visibility is
  'private = niemand ausser der Person selbst, contacts = angenommene Kontakte, members = alle eingeloggten Mitglieder, public = auch die oeffentlichen Netzwerkseiten. Voreinstellung private, damit uebernommene Altwerte nicht rueckwirkend sichtbar werden.';

-- ---------------------------------------------------------------------------
-- Die Altwerte, still uebernommen
-- ---------------------------------------------------------------------------
-- Nur, was der Pruefung standhaelt. Ein kaputter Altwert wuerde die Migration
-- sonst an der Check-Constraint scheitern lassen, und ein halb uebernommener
-- Bestand ist schlimmer als gar keiner: Die Person kann ihn jederzeit neu
-- eintragen, aber sie kann nicht erkennen, dass etwas verschluckt wurde.
update public.person_core core
set linkedin_url = legacy.linkedin_url
from public.profiles legacy
where legacy.user_id = core.user_id
  and core.linkedin_url is null
  and legacy.linkedin_url ~ '^https://([a-z0-9-]+\.)*linkedin\.com/[^[:space:]]*$';

-- ---------------------------------------------------------------------------
-- Der einzige Weg, ein fremdes LinkedIn-Profil zu lesen
-- ---------------------------------------------------------------------------
-- `person_core` ist owner-only und bleibt es. Statt die Tabelle zu oeffnen,
-- gibt diese Funktion genau ein Feld heraus und nur dann, wenn die betroffene
-- Person diese Stufe gewaehlt hat.
--
-- Bewusst als Liste: Die Aufrufer sind Trefferlisten und Kontaktlisten. Eine
-- Einzelabfrage je Zeile waere dieselbe Pruefung n-mal.
create or replace function public.list_member_linkedin_urls(p_user_ids uuid[])
returns table (user_id uuid, linkedin_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  return query
  select core.user_id, core.linkedin_url
  from public.person_core core
  where core.user_id = any(coalesce(p_user_ids, array[]::uuid[]))
    and core.linkedin_url is not null
    and (
      -- Die eigene Angabe sieht man immer, unabhaengig von der Stufe.
      core.user_id = auth.uid()
      or core.linkedin_visibility in ('members', 'public')
      or (
        core.linkedin_visibility = 'contacts'
        and exists (
          select 1
          from public.network_contact_requests request
          where request.status = 'accepted'
            and (
              (request.sender_user_id = auth.uid() and request.recipient_user_id = core.user_id)
              or (request.recipient_user_id = auth.uid() and request.sender_user_id = core.user_id)
            )
        )
      )
    );
end;
$$;

revoke all on function public.list_member_linkedin_urls(uuid[]) from public;
grant execute on function public.list_member_linkedin_urls(uuid[]) to authenticated;

comment on function public.list_member_linkedin_urls(uuid[]) is
  'Gibt LinkedIn-Adressen nur fuer Menschen zurueck, die die passende Stufe gewaehlt haben. "contacts" verlangt eine angenommene Kontaktanfrage in eine der beiden Richtungen.';

-- ---------------------------------------------------------------------------
-- Und der Weg fuer die oeffentlichen Seiten
-- ---------------------------------------------------------------------------
-- Die oeffentlichen Netzwerkseiten sind nicht angemeldet und werden von
-- Suchmaschinen gelesen. Deshalb eine eigene Funktion mit einer einzigen,
-- engeren Bedingung: ausschliesslich Stufe 'public'.
--
-- Bis hierher galt fuer die oeffentliche Projektion ein pauschales Verbot - der
-- pgTAP-Test haelt fest, dass `network_profiles` keine `linkedin_url` traegt.
-- Das bleibt richtig und bleibt so: Die Adresse wandert NICHT in die Projektion.
-- Was sich aendert, ist etwas anderes als ein aufgeweichtes Verbot - aus
-- "niemals" wird "nur, wenn die Person es ausdruecklich fuer oeffentlich
-- erklaert hat". Ein Versehen kann dabei nicht herausfallen: Ohne aktive Wahl
-- steht die Stufe auf 'private'.
create or replace function public.get_public_network_profile_linkedin(p_public_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select core.linkedin_url
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.person_core core on core.user_id = profile.user_id
  where profile.public_slug = p_public_slug
    -- Dieselben Bedingungen wie get_public_network_profile: Ist die Seite
    -- selbst nicht oeffentlich, gibt es hier auch nichts zu holen.
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    -- Und zusaetzlich die eigene Entscheidung fuer genau diese Angabe. Ein
    -- oeffentliches Netzwerkprofil zu haben, ist keine Zustimmung dazu, auch
    -- den Klarnamen-Lebenslauf daneben zu stellen.
    and core.linkedin_visibility = 'public'
    and core.linkedin_url is not null;
$$;

revoke all on function public.get_public_network_profile_linkedin(text) from public;
grant execute on function public.get_public_network_profile_linkedin(text) to anon, authenticated, service_role;

comment on function public.get_public_network_profile_linkedin(text) is
  'Fuer die oeffentlichen Netzwerkseiten. Gibt die LinkedIn-Adresse nur heraus, wenn das Netzwerkprofil oeffentlich ist UND die Person fuer die Adresse selbst Stufe "public" gewaehlt hat. Ueber den Slug und nicht ueber die user_id, weil die oeffentliche Projektion bewusst keine user_id enthaelt.';

commit;
