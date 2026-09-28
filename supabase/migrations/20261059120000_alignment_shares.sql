begin;

-- ---------------------------------------------------------------------------
-- Schritt 6a: Die Freigabe - wer wessen Antworten sehen darf
-- ---------------------------------------------------------------------------
--
-- Teil F7 des Gutachtens, woertlich:
--
--   "Vor dem Teilen sieht jede Person eine Vorschau ihrer Angaben; private
--   Geldbetraege oder Gruende koennen ausgeblendet werden. Wer wessen konkrete
--   Antworten sehen darf, muss im Produkt eindeutig sein. Nicht teilbare
--   Felder sind im Teamreport 'nicht geteilt', nicht 'fehlendes Commitment'.
--   Eine Freigabe von Ergebnissen darf nicht als Einverstaendnis zu
--   Investor-Screening oder Auswahlentscheidungen umgedeutet werden."
--
-- Bis jetzt war `alignment_answers` ausschliesslich fuer die eigene Person
-- lesbar. Das war richtig - aber ein Vergleich kaeme so an gar nichts heran.
--
-- DIE FREIGABE IST GERICHTET UND EINZELN. Nicht "mein Profil ist oeffentlich",
-- sondern "diese Person darf diesen Fragebogen sehen, bis ich es zurueckziehe,
-- und diese Bloecke nicht". Eine Zustimmung, die alles auf einmal erlaubt,
-- wird erteilt, ohne gelesen zu werden.
--
-- WARUM AUSBLENDEN UND NICHT WEGLASSEN. Wer seinen Gehaltsbedarf nicht teilt,
-- erscheint als "nicht geteilt" - nicht als Luecke und schon gar nicht als
-- mangelndes Engagement. Der Unterschied steht ausdruecklich im Gutachten und
-- ist der Grund, warum die Ausblendung eine eigene Tabelle hat statt einfach
-- die Zeile zu loeschen: Die Antwort bleibt der Person erhalten.
-- ---------------------------------------------------------------------------

create table public.alignment_shares (
  id uuid primary key default gen_random_uuid(),

  assessment_id uuid not null
    references public.assessments (id) on delete cascade,

  /** Wer sehen darf. Genau eine Person, nicht "alle im Team". */
  recipient_user_id uuid not null
    references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),
  /** Zurueckziehen loescht nicht, es beendet. Die Freigabe bleibt nachweisbar. */
  revoked_at timestamptz,

  constraint alignment_shares_once unique (assessment_id, recipient_user_id)
);

comment on table public.alignment_shares is
  'Gerichtete Freigabe eines abgegebenen Fragebogens an genau eine Person. '
  'Zurueckziehen beendet sie, loescht sie aber nicht.';

-- ---------------------------------------------------------------------------
-- Was ausgeblendet bleibt
-- ---------------------------------------------------------------------------

create table public.alignment_share_hidden_blocks (
  share_id uuid not null
    references public.alignment_shares (id) on delete cascade,
  block_id text not null,
  primary key (share_id, block_id),
  constraint alignment_share_hidden_block_shape check (block_id ~ '^[A-Z][0-9]{2}$')
);

comment on table public.alignment_share_hidden_blocks is
  'Einzelne Bloecke, die diese Freigabe nicht umfasst. Im Report erscheinen '
  'sie als "nicht geteilt" - nicht als fehlende Angabe.';

-- ---------------------------------------------------------------------------
-- Zugriff
-- ---------------------------------------------------------------------------

alter table public.alignment_shares enable row level security;
alter table public.alignment_share_hidden_blocks enable row level security;
revoke all on public.alignment_shares from public, anon, authenticated;
revoke all on public.alignment_share_hidden_blocks from public, anon, authenticated;
grant select, insert, update, delete on public.alignment_shares to authenticated;
grant select, insert, delete on public.alignment_share_hidden_blocks to authenticated;

/**
 * Gehoert dieser Fragebogen mir?
 *
 * SECURITY DEFINER, weil die Policy auf `alignment_answers` sonst gegen die
 * Policy auf `assessments` liefe und der Empfaenger die Zeile nicht sehen
 * koennte, ueber die er gerade berechtigt wird.
 */
create function public.owns_assessment(p_assessment_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessments assessment
    where assessment.id = p_assessment_id and assessment.user_id = p_user_id
  );
$$;

revoke all on function public.owns_assessment(uuid, uuid) from public, anon;
grant execute on function public.owns_assessment(uuid, uuid) to authenticated;

-- Die eigene Freigabe verwalten, und als Empfaenger sehen, was man bekommen hat.
create policy alignment_shares_select on public.alignment_shares
  for select to authenticated
  using (
    public.owns_assessment(assessment_id)
    or recipient_user_id = auth.uid()
  );

-- NUR ABGEGEBENE FRAGEBOEGEN WERDEN FREIGEGEBEN. Einen Entwurf zu teilen
-- hiesse, dass sich das Geteilte danach noch aendert - und der Empfaenger
-- haette etwas anderes gelesen, als spaeter dasteht.
create policy alignment_shares_insert on public.alignment_shares
  for insert to authenticated
  with check (
    public.owns_assessment(assessment_id)
    and recipient_user_id <> auth.uid()
    and exists (
      select 1 from public.assessments assessment
      where assessment.id = assessment_id and assessment.submitted_at is not null
    )
  );

create policy alignment_shares_update on public.alignment_shares
  for update to authenticated
  using (public.owns_assessment(assessment_id));

create policy alignment_shares_delete on public.alignment_shares
  for delete to authenticated
  using (public.owns_assessment(assessment_id));

create policy alignment_share_hidden_select on public.alignment_share_hidden_blocks
  for select to authenticated
  using (
    exists (
      select 1 from public.alignment_shares share
      where share.id = share_id
        and (public.owns_assessment(share.assessment_id) or share.recipient_user_id = auth.uid())
    )
  );

create policy alignment_share_hidden_write on public.alignment_share_hidden_blocks
  for insert to authenticated
  with check (
    exists (
      select 1 from public.alignment_shares share
      where share.id = share_id and public.owns_assessment(share.assessment_id)
    )
  );

create policy alignment_share_hidden_remove on public.alignment_share_hidden_blocks
  for delete to authenticated
  using (
    exists (
      select 1 from public.alignment_shares share
      where share.id = share_id and public.owns_assessment(share.assessment_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Und jetzt darf der Empfaenger lesen - genau das Freigegebene
-- ---------------------------------------------------------------------------
--
-- DIE AUSGEBLENDETE ANTWORT KOMMT GAR NICHT HERAUS, auch nicht als Zeile mit
-- leerem Wert. Das ist KEIN Geheimhalten der Tatsache, dass ausgeblendet
-- wurde: Der Empfaenger darf `alignment_share_hidden_blocks` lesen und sieht
-- genau, welcher Block nicht dabei ist. So will es das Gutachten - "nicht
-- teilbare Felder sind im Teamreport 'nicht geteilt', nicht 'fehlendes
-- Commitment'".
--
-- Getrennt sind also die Auskunft und der Inhalt: DASS etwas zurueckgehalten
-- wird, steht an der Freigabe. WAS es war, kommt nirgends heraus. Eine
-- halbleere Antwortzeile wuerde beides vermischen - sie saehe aus wie eine
-- Antwort und waere doch keine, und jede Auswertung muesste den Sonderfall
-- kennen, um ihn nicht mitzuzaehlen.

create policy alignment_answers_select_shared on public.alignment_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.alignment_shares share
      where share.assessment_id = alignment_answers.assessment_id
        and share.recipient_user_id = auth.uid()
        and share.revoked_at is null
        and not exists (
          select 1 from public.alignment_share_hidden_blocks hidden
          where hidden.share_id = share.id
            and hidden.block_id = alignment_answers.block_id
        )
    )
  );

-- Damit ein Empfaenger den Fragebogen ueberhaupt findet, muss er die Kopfzeile
-- sehen duerfen - aber nur diese eine und nur solange die Freigabe gilt.
create policy assessments_select_alignment_share on public.assessments
  for select to authenticated
  using (
    exists (
      select 1 from public.alignment_shares share
      where share.assessment_id = assessments.id
        and share.recipient_user_id = auth.uid()
        and share.revoked_at is null
    )
  );

create index alignment_shares_recipient_idx
  on public.alignment_shares (recipient_user_id)
  where revoked_at is null;

commit;
