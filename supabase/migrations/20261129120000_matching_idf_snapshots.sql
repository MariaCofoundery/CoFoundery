begin;

-- ---------------------------------------------------------------------------
-- Eingefrorene IDF-Snapshots für CONNECT (Matching v0.1, Spec §11.2)
-- ---------------------------------------------------------------------------
--
-- WOFÜR: CONNECT C1 gewichtet die Text-Token eines Gesuchs mit
--   idf(tok) = ln((N + 1) / (df(tok) + 1)).
-- N und df kommen aus einem bewusst gebauten, versionierten Snapshot, nie live
-- aus der Datenbank. Diese Migration legt nur die Ablage und den Korpus-Zugang
-- an. Kein Produktpfad liest sie; CONNECT und FIND ranken unverändert.
--
-- KORPUS (Spec §11.2): Titel, Beschreibung und Themen von CONNECT-Einträgen,
-- die zum Snapshot-Zeitpunkt fürs Matching verwendet werden dürfen - dieselben
-- Bedingungen, unter denen ein Eintrag Mitgliedern überhaupt erscheint
-- (network_listings_select, get_public_network_listing):
--   Eintrag aktiv und nicht abgelaufen, Sichtbarkeit members_only oder public,
--   Profil aktiv, Mitgliedschaft aktiv.
-- Blockierungen gelten zwischen zwei Personen und betreffen den gemeinsamen
-- Korpus nicht. Profile, Probleme, Ventures, Nachrichten, Capability, Workstyle
-- und Research sind keine Korpus-Dokumente (Spec §4: nicht Eingabe von v0.1).
--
-- GESPEICHERT: nur N, die df-Tabelle (normalisierte Token -> Anzahl Dokumente),
-- Versionen, Hash und Zeitpunkte. Keine Texte, keine Nutzer- oder Eintrags-IDs.
--
-- UNVERÄNDERLICH: Ein Snapshot wird einmal eingefügt und nie geändert. Ein neuer
-- Korpus ist eine neue Zeile mit neuer Version.

-- 1. Ablage ----------------------------------------------------------------
create table public.matching_idf_snapshots (
  idf_corpus_version text primary key,
  scope text not null check (scope = 'connect'),
  matching_version text not null check (matching_version ~ '^matching-v[0-9]+\.[0-9]+$'),
  normalization_version text not null check (normalization_version ~ '^matching-normalization-v[0-9]+\.[0-9]+$'),
  corpus_as_of timestamptz not null,
  document_count integer not null check (document_count >= 0),
  document_frequencies jsonb not null check (jsonb_typeof(document_frequencies) = 'object'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

comment on table public.matching_idf_snapshots is
  'Eingefrorene IDF-Snapshots (N + df) für CONNECT Matching v0.1. Nur anhängen, nie ändern. Keine Texte, keine IDs. Nur serverseitig (service_role).';
comment on column public.matching_idf_snapshots.idf_corpus_version is
  'connect-idf-<matching_version>-<YYYYMMDD corpus_as_of UTC>-<erste 8 Zeichen sha256> (Spec §11.2).';
comment on column public.matching_idf_snapshots.sha256 is
  'SHA-256 der kanonischen Form {"df":{…},"n":N} mit sortierten Schlüsseln, wie web/src/lib/matching/v01/idf.ts und der Python-Generator.';

alter table public.matching_idf_snapshots enable row level security;
revoke all on table public.matching_idf_snapshots from public, anon, authenticated, service_role;
grant select, insert on table public.matching_idf_snapshots to service_role;

-- 2. Prüfung beim Einfügen ---------------------------------------------------
-- Die Datenbank rechnet den Hash selbst nach und leitet die Version daraus ab,
-- damit keine Zeile mit falschem Hash, falscher Version oder Fremdinhalt in
-- der df-Tabelle entsteht. Token sind nach der Normalisierung immer [a-z0-9]
-- mit mindestens 3 Zeichen; alles andere wäre Rohtext.
create or replace function public.validate_matching_idf_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_canonical text;
  v_bad integer;
begin
  select count(*) into v_bad
  from jsonb_each(new.document_frequencies) entry
  where entry.key !~ '^[a-z0-9]{3,}$'
     or case
          when jsonb_typeof(entry.value) = 'number' and entry.value::text ~ '^[1-9][0-9]{0,9}$'
            then entry.value::text::bigint > new.document_count
          else true
        end;
  if v_bad > 0 then
    raise exception 'matching_idf_snapshot_df_invalid' using errcode = '23514';
  end if;

  select '{"df":{'
         || coalesce(string_agg(to_jsonb(entry.key)::text || ':' || entry.value::text, ',' order by entry.key collate "C"), '')
         || '},"n":' || new.document_count::text || '}'
    into v_canonical
  from jsonb_each(new.document_frequencies) entry;
  if encode(sha256(convert_to(v_canonical, 'UTF8')), 'hex') <> new.sha256 then
    raise exception 'matching_idf_snapshot_hash_mismatch' using errcode = '23514';
  end if;

  if new.idf_corpus_version <> 'connect-idf-' || new.matching_version || '-'
       || to_char(new.corpus_as_of at time zone 'UTC', 'YYYYMMDD') || '-' || left(new.sha256, 8) then
    raise exception 'matching_idf_snapshot_version_invalid' using errcode = '23514';
  end if;

  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.validate_matching_idf_snapshot() from public, anon, authenticated, service_role;

create trigger matching_idf_snapshots_validate
before insert on public.matching_idf_snapshots
for each row execute function public.validate_matching_idf_snapshot();

-- 3. Unveränderlich ----------------------------------------------------------
-- Auch für service_role und den Eigentümer: Ein veröffentlichter Snapshot wird
-- nie still überschrieben oder gelöscht. Ein Rückbau alter Versionen ist keine
-- Produktlogik, sondern eine eigene, bewusste Migration.
create or replace function public.block_matching_idf_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'matching_idf_snapshot_is_immutable' using errcode = '42501';
end;
$$;

revoke all on function public.block_matching_idf_snapshot_mutation() from public, anon, authenticated, service_role;

create trigger matching_idf_snapshots_immutable
before update or delete on public.matching_idf_snapshots
for each row execute function public.block_matching_idf_snapshot_mutation();

create trigger matching_idf_snapshots_no_truncate
before truncate on public.matching_idf_snapshots
for each statement execute function public.block_matching_idf_snapshot_mutation();

-- 4. Korpus-Dokumente für den Builder ----------------------------------------
-- Ein Dokument = ein CONNECT-Eintrag (beide Richtungen), wie im getesteten
-- Experiment (TextIndex über alle Einträge). Zurück kommen nur die drei
-- Textfelder, die C1 tokenisiert - keine IDs, keine Besitzer. Nur der Builder
-- (service_role) ruft das auf; ins Ergebnis eines Snapshots gelangen daraus nur
-- Zählwerte.
create or replace function public.connect_idf_corpus_documents(p_as_of timestamptz default now())
returns table (title text, summary text, topics text[])
language sql
stable
security invoker
set search_path = ''
as $$
  select listing.title, listing.summary, listing.topics
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.status = 'active'
    and listing.published_at <= p_as_of
    and listing.expires_at > p_as_of
    and listing.visibility in ('members_only', 'public')
    and profile.status = 'active'
    and membership.status = 'active'
  order by listing.id;
$$;

comment on function public.connect_idf_corpus_documents(timestamptz) is
  'Korpus des CONNECT-IDF-Snapshots (Spec §11.2): matching-erlaubte Einträge zum Zeitpunkt p_as_of. Nur service_role, nur für scripts/matching-idf-snapshot.ts.';

revoke all on function public.connect_idf_corpus_documents(timestamptz) from public, anon, authenticated;
grant execute on function public.connect_idf_corpus_documents(timestamptz) to service_role;

commit;
