-- Anmeldeseite: ist diese Einladung in eine Organisation gerade gueltig?
--
-- Wer in eine Organisation eingeladen wird, hat oft noch kein Konto. Ohne diese Frage kann die
-- Anmeldeseite ihm keinen Magic Link schicken, und er landet bei "Neu? Starte mit Zugangscode".
-- Die Funktion antwortet nur mit ja oder nein. Sie nimmt den Hash des Tokens (192 Bit), gibt
-- weder Organisation noch Adresse preis und sagt ja nur bei offener, nicht abgelaufener Einladung
-- einer aktiven Organisation. Das Konto entsteht erst, wenn die Person die Mail erhalten hat;
-- beitreten kann sie danach nur mit genau der Adresse, an die die Einladung ging.

begin;

create or replace function public.is_valid_advisor_org_invite(p_token_hash text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_org_invites i
    join public.advisor_orgs o on o.id = i.org_id and o.status = 'active'
    where i.token_hash = coalesce(p_token_hash, '')
      and i.status = 'sent' and i.expires_at > pg_catalog.now()
  );
$$;
revoke all on function public.is_valid_advisor_org_invite(text) from public;
grant execute on function public.is_valid_advisor_org_invite(text) to anon, authenticated;

commit;
