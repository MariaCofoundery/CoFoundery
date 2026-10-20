begin;

-- ---------------------------------------------------------------------------
-- LinkedIn nur fuer Kontakte
-- ---------------------------------------------------------------------------
-- Die Adresse ist der Klarname plus Lebenslauf plus Netzwerk. Sie soll auf
-- dieser Website bleiben und nur dort stehen, wo man schon im Gespraech ist:
-- bei angenommenen Kontakten. Die Stufen "members" (alle eingeloggten
-- Mitglieder) und "public" (offene Netzwerkseiten) fallen weg.
--
-- Bestehende Werte werden nur ENGER: wer "members" oder "public" gewaehlt
-- hatte, steht danach auf "contacts" - nie auf etwas Weiteres.
update public.person_core
set linkedin_visibility = 'contacts'
where linkedin_visibility in ('members', 'public');

alter table public.person_core
  drop constraint person_core_linkedin_visibility_check;

alter table public.person_core
  add constraint person_core_linkedin_visibility_check
    check (linkedin_visibility in ('private', 'contacts'));

comment on column public.person_core.linkedin_visibility is
  'private = niemand ausser der Person selbst, contacts = angenommene Kontakte. Mehr gibt es nicht: die Adresse bleibt auf der Website. Voreinstellung private.';

-- Die oeffentliche Projektion der Adresse gibt es nicht mehr.
drop function public.get_public_network_profile_linkedin(text);

-- Nur noch Selbst und angenommene Kontakte.
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
  'Gibt LinkedIn-Adressen nur an die Person selbst und an angenommene Kontakte zurueck, und nur bei Stufe "contacts".';

commit;
