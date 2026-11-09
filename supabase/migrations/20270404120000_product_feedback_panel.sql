-- Feedback neu: eine Art, ein Text, der Ort, optional die Wichtigkeit - und ein ausdrueckliches "darf angeschrieben werden".
--
-- Entwurf vom 09.11.2026 (freigegeben). Bisher: drei Pflichtfragen (q1-q3) plus zwei freiwillige, ohne Ort. Jetzt:
--   kind        help | unclear | bug | missing  (Das hat geholfen / unklar / Fehler / fehlt)
--   message     der eine Text (Pflicht bei neuem Feedback)
--   importance  minor | important | very       (freiwillig, nur fuer die Gruenderin sichtbar)
--   area        Bereich und Unterbereich, z. B. "connect.people" - kommt aus der Adresse, nicht aus der Eingabe
--   page_path   die Seite OHNE Kennungen: jede Kennung/jeder Code in der Adresse ist durch ":id" ersetzt
--   device      desktop | phone
--   may_contact ausdrueckliche Erlaubnis fuer Rueckfragen zu DIESEM Feedback - getrennt von allem anderen, Standard: nein
--
-- Altes Feedback bleibt unveraendert lesbar: q1-q3 sind nicht mehr Pflicht, aber ein Eintrag hat entweder die alten drei
-- Antworten oder eine Art mit Text.
--
-- Die E-Mail-Adresse einer Person gibt die Admin-Liste NUR heraus, wenn may_contact gesetzt ist.

begin;

alter table public.product_feedback
  alter column q1_value drop not null,
  alter column q2_value drop not null,
  alter column q3_value drop not null,
  add column kind text check (kind in ('help', 'unclear', 'bug', 'missing')),
  add column message text check (message is null or char_length(btrim(message)) between 1 and 4000),
  add column importance text check (importance in ('minor', 'important', 'very')),
  add column area text check (area ~ '^[a-z]{1,20}(\.[a-z]{1,20})?$'),
  add column page_path text check (page_path is null or (char_length(page_path) <= 300 and page_path ~ '^/')),
  add column device text check (device in ('desktop', 'phone')),
  add column may_contact boolean not null default false;

alter table public.product_feedback
  add constraint product_feedback_shape check (
    (kind is null and q1_value is not null and q2_value is not null and q3_value is not null)
    or (kind is not null and message is not null)
  );

create index product_feedback_kind_area_idx on public.product_feedback (kind, area);

comment on column public.product_feedback.may_contact is
  'Ausdrueckliche Erlaubnis, die Person zu DIESEM Feedback anzuschreiben. Standard nein; getrennt von jeder anderen Einwilligung.';
comment on column public.product_feedback.page_path is
  'Die Seite ohne Kennungen (":id" statt jeder Kennung oder jedes Codes). Nie Abfrage oder Inhalte.';

-- Die Liste fuer den Admin-Bereich: mit den neuen Feldern und Filtern nach Art und Bereich.
drop function public.admin_list_feedback(text, integer);

create function public.admin_list_feedback(p_tab text, p_offset integer, p_kind text default null, p_area text default null)
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return query
    select jsonb_build_object(
      'id', f.id, 'created_at', f.created_at, 'source', f.source,
      'sender_name', pc.display_name, 'account_since', pc.created_at,
      'q1', f.q1_value, 'q2', f.q2_value, 'q3', f.q3_value,
      'q4_choice', f.q4_choice, 'q4_other_text', f.q4_other_text, 'q5', f.q5_text,
      'kind', f.kind, 'message', f.message, 'importance', f.importance,
      'area', f.area, 'page_path', f.page_path, 'device', f.device,
      'may_contact', f.may_contact,
      -- Die Adresse nur, wenn die Person Rueckfragen erlaubt hat.
      'contact_email', case when f.may_contact then (select u.email from auth.users u where u.id = f.user_id) else null end,
      'is_new', r.feedback_id is null)
    from public.product_feedback f
    left join public.person_core pc on pc.user_id = f.user_id
    left join public.admin_feedback_reads r on r.feedback_id = f.id and r.admin_user_id = auth.uid()
    where case coalesce(p_tab, 'new') when 'new' then r.feedback_id is null when 'read' then r.feedback_id is not null else true end
      and (p_kind is null or f.kind = p_kind)
      and (p_area is null or f.area = p_area or f.area like p_area || '.%')
    order by f.created_at desc, f.id
    limit 26 offset greatest(0, least(coalesce(p_offset, 0), 100000));
end $$;

revoke all on function public.admin_list_feedback(text, integer, text, text) from public, anon;
grant execute on function public.admin_list_feedback(text, integer, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
