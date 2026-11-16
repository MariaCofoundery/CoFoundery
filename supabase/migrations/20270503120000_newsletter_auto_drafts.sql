-- Newsletter: automatisch vorbereitete Entwuerfe (Entwurf 16.11.2026).
--
-- Ein zeitgesteuerter Lauf (Claude mit Recherche) legt alle zwei Wochen zwei bis drei Varianten als ENTWUERFE an. Sie landen im Admin,
-- Maria sucht eine aus, aendert sie und sendet selbst. Der Lauf darf nie senden und nie einplanen: Er kann nur Entwuerfe anlegen.
-- Pro Tag hoechstens neun automatische Entwuerfe, damit ein Fehler oder Missbrauch des Zugangs die Liste nicht flutet.
begin;

alter table public.newsletter_issues
  add column origin text not null default 'manual',
  add column variant text not null default '',
  add column batch_id uuid,
  add column notes text not null default '',
  add constraint newsletter_issues_origin check (origin in ('manual', 'auto')),
  add constraint newsletter_issues_auto_meta check (char_length(variant) <= 40 and char_length(notes) <= 4000);

drop function public.admin_list_newsletter_issues();
create function public.admin_list_newsletter_issues()
returns table (id uuid, title text, subject text, status text, scheduled_for timestamptz, sent_at timestamptz, updated_at timestamptz, delivered bigint,
               origin text, variant text, batch_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select i.id, i.title, i.subject, i.status, i.scheduled_for, i.sent_at, i.updated_at,
    (select count(*) from public.newsletter_deliveries d where d.issue_id = i.id), i.origin, i.variant, i.batch_id
  from public.newsletter_issues i order by i.created_at desc;
end;
$$;
revoke all on function public.admin_list_newsletter_issues() from public, anon;
grant execute on function public.admin_list_newsletter_issues() to authenticated;

-- Nur der Dienst (die Route mit dem Zugangsschluessel). Legt IMMER einen Entwurf an.
create function public.service_create_newsletter_draft(p jsonb, p_variant text, p_batch uuid, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select count(*) from public.newsletter_issues where origin = 'auto' and created_at > pg_catalog.now() - interval '1 day') >= 9 then
    raise exception 'newsletter_auto_limit' using errcode = '54000';
  end if;
  insert into public.newsletter_issues (title, subject, preheader, look, accent, header_mode, header_image_path, header_alt, font, button_style, heading_case, blocks,
                                        origin, variant, batch_id, notes)
  values (
    coalesce(p->>'title', ''), coalesce(p->>'subject', ''), coalesce(p->>'preheader', ''), coalesce(p->>'look', 'light'), coalesce(p->>'accent', '#5b3df5'),
    coalesce(p->>'header_mode', 'gradient'), nullif(p->>'header_image_path', ''), coalesce(p->>'header_alt', ''), coalesce(p->>'font', 'serif'),
    coalesce(p->>'button_style', 'round'), coalesce(p->>'heading_case', 'normal'), coalesce(p->'blocks', '[]'::jsonb),
    'auto', left(coalesce(p_variant, ''), 40), p_batch, left(coalesce(p_notes, ''), 4000)
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.service_create_newsletter_draft(jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.service_create_newsletter_draft(jsonb, text, uuid, text) to service_role;

commit;
