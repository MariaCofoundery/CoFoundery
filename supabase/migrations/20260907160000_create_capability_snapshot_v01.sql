begin;

-- PHASE 3a: Datenmodell fuer den Capability Snapshot.
--
-- Fachliche Grundlage: web/docs/capability-model-technical-brief.md
--
-- Vier Tabellen:
--   capability_families        Referenz, 8 Zeilen  (obere Ebene, Deckungsansicht)
--   capability_areas           Referenz, 42 Zeilen (untere Ebene, Auswahl)
--   person_capability_entries  eine Zeile pro (Person, Bereich)
--   person_capability_evidence erzaehlter Beleg zu einem Eintrag
--
-- Das Vokabular liegt bewusst in der Datenbank und nicht als Konstante im
-- Code. Damit haben die Eintraege echte Fremdschluessel, und es gibt genau
-- eine Wahrheit. Eine zweite Liste im Code waere dieselbe Driftgefahr, die im
-- Juli zwischen Migration und Anwendung entstanden ist. Anzeigetexte liegen
-- in i18n, geschluesselt ueber diese IDs - die Tabellen halten keine Labels.
--
-- Sichtbarkeit: person_capability_* ist in dieser Phase strikt owner-only.
-- Was davon spaeter in Suche oder Profil sichtbar wird, entscheidet eine
-- eigene Publikationsebene (Kapitel 13 des Briefs). Kein Feld wird durch das
-- Anlegen hier oeffentlich.

-- ---------------------------------------------------------------------------
-- Referenzvokabular
-- ---------------------------------------------------------------------------
create table public.capability_families (
  family_id text primary key,
  sort_order smallint not null unique,
  constraint capability_families_id_format check (family_id ~ '^[a-z][a-z_]*[a-z]$')
);

create table public.capability_areas (
  area_id text primary key,
  family_id text not null references public.capability_families(family_id) on delete restrict,
  sort_order smallint not null,
  constraint capability_areas_id_format check (area_id ~ '^[a-z][a-z_0-9]*[a-z0-9]$'),
  constraint capability_areas_family_order_unique unique (family_id, sort_order)
);
create index capability_areas_family_idx on public.capability_areas (family_id, sort_order);

insert into public.capability_families (family_id, sort_order) values
  ('customer_market', 1),
  ('product_value', 2),
  ('strategy_business_model', 3),
  ('technology_delivery', 4),
  ('commercial_growth', 5),
  ('finance_funding', 6),
  ('operations_people', 7),
  ('legal_governance', 8);

insert into public.capability_areas (area_id, family_id, sort_order) values
  ('customer_discovery', 'customer_market', 1),
  ('user_research', 'customer_market', 2),
  ('market_analysis', 'customer_market', 3),
  ('target_segments', 'customer_market', 4),
  ('industry_domain', 'customer_market', 5),

  ('product_discovery', 'product_value', 1),
  ('product_management', 'product_value', 2),
  ('product_strategy', 'product_value', 3),
  ('ux_design', 'product_value', 4),
  ('prototyping', 'product_value', 5),

  ('business_model', 'strategy_business_model', 1),
  ('pricing', 'strategy_business_model', 2),
  ('positioning', 'strategy_business_model', 3),
  ('strategic_planning', 'strategy_business_model', 4),

  ('software_engineering', 'technology_delivery', 1),
  ('technical_architecture', 'technology_delivery', 2),
  ('data_analytics', 'technology_delivery', 3),
  ('ai_ml', 'technology_delivery', 4),
  ('hardware_production', 'technology_delivery', 5),
  ('service_delivery', 'technology_delivery', 6),

  ('b2b_sales', 'commercial_growth', 1),
  ('b2c_growth', 'commercial_growth', 2),
  ('marketing_brand', 'commercial_growth', 3),
  ('performance_marketing', 'commercial_growth', 4),
  ('partnerships', 'commercial_growth', 5),
  ('customer_success', 'commercial_growth', 6),
  ('community', 'commercial_growth', 7),

  ('financial_planning', 'finance_funding', 1),
  ('unit_economics', 'finance_funding', 2),
  ('accounting_controlling', 'finance_funding', 3),
  ('fundraising', 'finance_funding', 4),
  ('investor_relations', 'finance_funding', 5),

  ('operations', 'operations_people', 1),
  ('process_design', 'operations_people', 2),
  ('recruiting', 'operations_people', 3),
  ('people_management', 'operations_people', 4),
  ('org_design', 'operations_people', 5),

  ('corporate_legal', 'legal_governance', 1),
  ('ip', 'legal_governance', 2),
  ('data_protection', 'legal_governance', 3),
  ('compliance_regulatory', 'legal_governance', 4),
  ('security', 'legal_governance', 5);

-- Auffangwert. Global und nicht pro Familie, damit sich Eintraege dort
-- buendeln und als Signal fuer die naechste Ueberarbeitung der Liste dienen.
insert into public.capability_families (family_id, sort_order) values ('other', 9);
insert into public.capability_areas (area_id, family_id, sort_order) values ('other', 'other', 1);

alter table public.capability_families enable row level security;
alter table public.capability_areas enable row level security;
revoke all on public.capability_families from public, anon, authenticated;
revoke all on public.capability_areas from public, anon, authenticated;
grant select on public.capability_families to authenticated;
grant select on public.capability_areas to authenticated;
create policy capability_families_select_members on public.capability_families
  for select to authenticated using (true);
create policy capability_areas_select_members on public.capability_areas
  for select to authenticated using (true);

comment on table public.capability_areas is
  'Referenzvokabular der Funktionsbereiche. Einzige Wahrheit; Anzeigetexte liegen in i18n unter der area_id.';

-- ---------------------------------------------------------------------------
-- Eintraege pro Person und Bereich
-- ---------------------------------------------------------------------------
-- application_level und ownership_wish sind absichtlich nullable: Eine Person
-- kann einen Bereich waehlen, ohne ihn schon eingestuft zu haben. Leer heisst
-- hier wie im Kern ausschliesslich "noch nichts eingetragen", nie "Stufe 0".
create table public.person_capability_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.person_core(user_id) on delete cascade,
  area_id text not null references public.capability_areas(area_id) on delete restrict,
  application_level smallint,
  ownership_wish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_capability_entries_user_area_unique unique (user_id, area_id),
  -- Die fuenf Anwendungsstufen aus Kapitel 6 des Briefs. Bewusst keine
  -- abstrakte Skala: 1 = noch nicht praktisch angewandt bis 5 = auch in
  -- anspruchsvolleren Situationen angewandt, kann andere unterstuetzen.
  constraint person_capability_entries_level_check
    check (application_level is null or application_level between 1 and 5),
  -- Die sechs Ownership-Zustaende aus Kapitel 7. CAN ist nicht WANT TO OWN:
  -- Erfahrung in einem Bereich sagt nichts darueber, ob jemand ihn dauerhaft
  -- verantworten moechte.
  constraint person_capability_entries_ownership_check
    check (ownership_wish is null or ownership_wish in (
      'own', 'contribute', 'grow_into', 'prefer_other', 'prefer_external', 'unclear'
    ))
);
create index person_capability_entries_user_idx on public.person_capability_entries (user_id);
create index person_capability_entries_area_idx on public.person_capability_entries (area_id);

-- ---------------------------------------------------------------------------
-- Erzaehlter Beleg
-- ---------------------------------------------------------------------------
-- Der Snapshot beginnt mit einer erzaehlten Sache, die die Person selbst
-- hinbekommen hat, und taggt sie auf einen Bereich. Der Beleg haengt deshalb
-- am Eintrag, nicht an der Person: er begruendet genau diese Einstufung.
--
-- Mehrere Belege pro Eintrag sind moeglich, damit spaeter weitere Stationen
-- ergaenzt werden koennen, ohne das Modell zu aendern.
create table public.person_capability_evidence (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.person_capability_entries(id) on delete cascade,
  narrative text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_capability_evidence_narrative_len
    check (char_length(btrim(narrative)) between 10 and 2000)
);
create index person_capability_evidence_entry_idx on public.person_capability_evidence (entry_id);

create or replace function public.set_capability_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger person_capability_entries_set_updated_at
  before update on public.person_capability_entries
  for each row execute function public.set_capability_updated_at();
create trigger person_capability_evidence_set_updated_at
  before update on public.person_capability_evidence
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Sichtbarkeit: strikt owner-only
-- ---------------------------------------------------------------------------
alter table public.person_capability_entries enable row level security;
alter table public.person_capability_evidence enable row level security;
revoke all on public.person_capability_entries from public, anon, authenticated;
revoke all on public.person_capability_evidence from public, anon, authenticated;
grant select, insert, update, delete on public.person_capability_entries to authenticated;
grant select, insert, update, delete on public.person_capability_evidence to authenticated;

create policy person_capability_entries_all_self on public.person_capability_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Belege erben die Zugehoerigkeit ueber den Eintrag. Die Unterabfrage prueft
-- den Eintrag ohne RLS-Rekursion, weil sie auf dieselbe Policy trifft.
create policy person_capability_evidence_all_self on public.person_capability_evidence
  for all to authenticated
  using (exists (
    select 1 from public.person_capability_entries entry
    where entry.id = person_capability_evidence.entry_id
      and entry.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.person_capability_entries entry
    where entry.id = person_capability_evidence.entry_id
      and entry.user_id = auth.uid()
  ));

comment on table public.person_capability_entries is
  'Was eine Person in einem Funktionsbereich getan hat und ob sie ihn verantworten moechte. Owner-only; Veroeffentlichung entscheidet eine spaetere Publikationsebene.';
comment on column public.person_capability_entries.ownership_wish is
  'Wunsch der Person, nicht Team-Vereinbarung. Vereinbarte Ownership dokumentiert das Founder Setup.';
comment on table public.person_capability_evidence is
  'Erzaehlter Beleg zu einer Einstufung. Traegt die Beleglage des Modells: Faehigkeit wird abgeleitet, nicht frei bewertet.';

commit;
