begin;

-- ---------------------------------------------------------------------------
-- Schritt 2a: Wo die Antworten auf das Instrument v2 liegen
-- ---------------------------------------------------------------------------
--
-- WARUM NICHT EINFACH `assessment_answers` WEITERBENUTZEN. Dort steht
-- `choice_value text NOT NULL` - eine einzige Zeichenkette, die es geben MUSS.
-- Das ist der strukturelle Grund, warum v1 nie getrennte Auslassungsgruende
-- hatte: Es gibt keinen Platz fuer "warum nicht". Wer "moechte ich nicht
-- angeben" trotzdem festhalten wollte, musste es als Wert hineinschreiben -
-- und ab da ist eine Verweigerung nicht mehr von einer Antwort zu
-- unterscheiden.
--
-- Und es passt auch inhaltlich nicht mehr. v2 hat zehn Antwortformate:
-- Stundenbereiche mit Einheit, Geldbetraege mit Waehrung und Brutto/Netto,
-- Zeitfenster, Mehrfachwahl, Wertekarten mit zwei getrennten
-- Wichtigkeitsurteilen. Nichts davon ist eine Zeichenkette.
--
-- WARUM DIE FRAGEN NICHT IN DIE DATENBANK WANDERN. v1 haelt `questions` und
-- `choices` als Zeilen. Fuer v2 waere das falsch herum: Das Gutachten sagt
-- ausdruecklich, die kognitiven Interviews DUERFEN das Modell veraendern.
-- Jede Textkorrektur waere sonst eine Migration. Die Registratur bleibt im
-- Code (`web/src/features/instruments/v2/`), hier liegen nur die Antworten -
-- und `block_id` zeigt deshalb bewusst auf keine Tabelle.
-- ---------------------------------------------------------------------------

create table public.alignment_answers (
  assessment_id uuid not null
    references public.assessments (id) on delete cascade,

  /** A01 bis X08, S01 bis G04, L01 bis L03, W01 bis W10. Kein Fremdschluessel:
      die Registratur liegt im Code, damit sie sich aendern darf. */
  block_id text not null,

  /**
   * In welchem Format diese Antwort gemeint war - MIT der Antwort gespeichert.
   *
   * Dieselbe Lehre wie bei `instrument_id`: Wenn ein Item spaeter sein Format
   * wechselt, muss eine alte Antwort weiterhin wissen, wie sie zu lesen ist.
   * Sonst wird aus einer Stundenzahl stillschweigend eine Skalenstufe.
   */
  answer_format text not null,

  /** Die Antwort. Immer ein Objekt, nie ein nackter Wert. */
  value jsonb,

  /** Oder der Grund, warum keine da ist. Nie beides. */
  missing_code text,

  answered_at timestamptz not null default now(),

  primary key (assessment_id, block_id),

  -- ENTWEDER EINE ANTWORT ODER EIN GRUND. Genau eins von beidem. Eine Zeile
  -- ohne beides waere ein Geist, eine mit beidem eine Luege.
  constraint alignment_answers_one_of
    check (num_nonnulls(value, missing_code) = 1),

  constraint alignment_answers_block_shape
    check (block_id ~ '^[A-Z][0-9]{2}$'),

  constraint alignment_answers_format_check
    check (answer_format in (
      'F', 'C',
      'single_choice', 'multi_choice', 'free_text', 'structured_text',
      'number_range', 'person_number_range', 'money_range', 'time_windows',
      'importance_rating', 'date',
      'value_case'
    )),

  -- Dieselben sechs Gruende wie in der Registratur im Code. 'technical' ist
  -- absichtlich dabei: ein Ausfall darf nicht als Auskunftsverhalten gelten.
  constraint alignment_answers_missing_code_check
    check (missing_code is null or missing_code in (
      'cannot_assess', 'not_relevant', 'withheld',
      'undecided', 'confidential_first', 'technical'
    )),

  -- Eine Antwort ist immer ein Objekt. Ein nacktes 3 oder "ja" waere wieder
  -- der Zustand, aus dem v1 nicht herauskam.
  constraint alignment_answers_value_is_object
    check (value is null or jsonb_typeof(value) = 'object'),

  -- WO EINE SKALENSTUFE STEHT, IST SIE 1 BIS 5 - nie 0, nie eine Mitte, die
  -- aus einer Auslassung entstanden ist.
  constraint alignment_answers_scale_range
    check (
      (value -> 'scale' is null or (jsonb_typeof(value -> 'scale') = 'number'
        and (value ->> 'scale')::numeric between 1 and 5))
      and (value -> 'importanceA' is null or (jsonb_typeof(value -> 'importanceA') = 'number'
        and (value ->> 'importanceA')::numeric between 1 and 5))
      and (value -> 'importanceB' is null or (jsonb_typeof(value -> 'importanceB') = 'number'
        and (value ->> 'importanceB')::numeric between 1 and 5))
    ),

  -- DER WICHTIGSTE CHECK. Ein Auslassungsgrund darf nie als Antworttext
  -- hereinkommen. Genau so ist er in v1 unsichtbar geworden: als Wert unter
  -- Werten, der spaeter mitgemittelt wurde.
  constraint alignment_answers_missing_is_not_a_value
    check (
      value is null or (
        coalesce(value ->> 'option', '') not in (
          'noch offen', 'noch nicht festgelegt', 'möchte ich nicht angeben',
          'noch nicht einschätzbar', 'möchte ich zunächst vertraulich klären')
        and coalesce(value ->> 'text', '') not in (
          'noch offen', 'noch nicht festgelegt', 'möchte ich nicht angeben',
          'noch nicht einschätzbar', 'möchte ich zunächst vertraulich klären')
      )
    ),

  -- Eine Zahl ohne Einheit ist keine Angabe. Das Gutachten verlangt
  -- ausdruecklich die Originaleinheit, nicht umgerechnet.
  constraint alignment_answers_number_needs_unit
    check (
      answer_format not in ('number_range', 'person_number_range')
      or value is null
      or nullif(btrim(coalesce(value ->> 'unit', '')), '') is not null
    ),

  -- Und ein Betrag ohne Waehrung erst recht nicht - Betraege verschiedener
  -- Laender duerfen nicht automatisch verglichen werden.
  constraint alignment_answers_money_needs_currency
    check (
      answer_format <> 'money_range'
      or value is null
      or nullif(btrim(coalesce(value ->> 'currency', '')), '') is not null
    ),

  -- Die Wertekarte braucht BEIDE Wichtigkeiten und einen Weg. Beide duerfen
  -- sehr wichtig sein; genau deshalb werden sie getrennt gespeichert und nicht
  -- als ein Schieberegler zwischen zwei Polen.
  constraint alignment_answers_value_case_shape
    check (
      answer_format <> 'value_case'
      or value is null
      or (
        value -> 'importanceA' is not null
        and value -> 'importanceB' is not null
        and value ->> 'path' in ('A', 'B', 'other', 'unknown')
      )
    )
);

comment on table public.alignment_answers is
  'Antworten auf das Instrument v2. Die Fragen selbst liegen im Code, damit '
  'die kognitiven Interviews das Modell aendern duerfen, ohne Migration.';

comment on column public.alignment_answers.missing_code is
  'Warum keine Antwort da ist. Getrennt vom Wert, damit "moechte ich nicht '
  'angeben" nie zu "weiss nicht" und nie zur Skalenmitte wird.';

create index alignment_answers_block_idx
  on public.alignment_answers (block_id);

-- ---------------------------------------------------------------------------
-- Zugriff: genau wie bei `assessment_answers`
-- ---------------------------------------------------------------------------
--
-- Nur die eigene Person, und nur mit der Founder-Berechtigung. Antworten sind
-- das Empfindlichste im Produkt: Sie enthalten Gehaltsbedarf, Verlustgrenzen
-- und selbst benannte Grenzen. Was ein Advisor sehen darf, entsteht weiterhin
-- ausschliesslich ueber `person_alignment_snapshots` und die engen Leser -
-- niemals ueber diese Tabelle.

alter table public.alignment_answers enable row level security;
revoke all on public.alignment_answers from public, anon, authenticated;
grant select, insert, update, delete on public.alignment_answers to authenticated;

create policy alignment_answers_select_owner on public.alignment_answers
  for select to authenticated
  using (
    public.has_founder_assessment_access()
    and exists (
      select 1 from public.assessments assessment
      where assessment.id = alignment_answers.assessment_id
        and assessment.user_id = auth.uid()
    )
  );

create policy alignment_answers_insert_owner on public.alignment_answers
  for insert to authenticated
  with check (
    public.has_founder_assessment_access()
    and exists (
      select 1 from public.assessments assessment
      where assessment.id = alignment_answers.assessment_id
        and assessment.user_id = auth.uid()
        and assessment.submitted_at is null
    )
  );

create policy alignment_answers_update_owner on public.alignment_answers
  for update to authenticated
  using (
    public.has_founder_assessment_access()
    and exists (
      select 1 from public.assessments assessment
      where assessment.id = alignment_answers.assessment_id
        and assessment.user_id = auth.uid()
        and assessment.submitted_at is null
    )
  );

-- LOESCHEN JA, ABER NUR SOLANGE NICHTS ABGEGEBEN IST. Eine Antwort
-- zurueckzunehmen muss moeglich sein - sonst ist "ich moechte das doch nicht
-- angeben" eine Sackgasse. Nach der Abgabe ist der Fragebogen ein Dokument,
-- und Dokumente aendern sich nicht rueckwirkend.
create policy alignment_answers_delete_owner on public.alignment_answers
  for delete to authenticated
  using (
    public.has_founder_assessment_access()
    and exists (
      select 1 from public.assessments assessment
      where assessment.id = alignment_answers.assessment_id
        and assessment.user_id = auth.uid()
        and assessment.submitted_at is null
    )
  );

commit;
