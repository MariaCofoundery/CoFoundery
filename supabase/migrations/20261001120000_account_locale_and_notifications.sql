begin;

-- ---------------------------------------------------------------------------
-- Zwei Angaben, die ans Konto gehoeren
-- ---------------------------------------------------------------------------
--
-- 1. DIE SPRACHE lag bisher nur in einem Cookie. Das hat zwei Folgen: Auf
--    einem zweiten Geraet ist sie wieder weg - und, schwerer, die
--    Benachrichtigungsmails nahmen `getRequestLocale()`, also die Sprache der
--    AUSLOESENDEN Anfrage. Wer eine Anzeige veroeffentlicht, loest damit Mails
--    an andere Menschen aus; die kamen in SEINER Sprache an, nicht in der der
--    Empfaengerin.
--
-- 2. BENACHRICHTIGUNGEN hatten genau einen Schalter, und der wirkte auf drei
--    von sieben Arten. Treffer gespeicherter Suchen aus Connect und aus Find,
--    Read-My-Mind-Uebergaben und Founder-in-the-Wild liefen ungefiltert - auch
--    fuer Menschen, die "Benachrichtigungen aus Connect" ausgeschaltet hatten.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1. Die Sprache
-- ---------------------------------------------------------------------------
-- Nullable mit Absicht: null heisst "noch nicht entschieden, nimm was der
-- Browser sagt". Eine Voreinstellung 'de' waere eine Behauptung ueber einen
-- Menschen, von dem wir es nicht wissen - und sie wuerde die
-- Browsererkennung stillschweigend abschalten.
alter table public.person_core
  add column locale text,
  add constraint person_core_locale_check
    check (locale is null or locale in ('de', 'en'));

comment on column public.person_core.locale is
  'Gewaehlte Sprache. Null heisst "nicht entschieden" - dann entscheidet der Browser. Massgeblich fuer Mails, die wir dieser Person schicken: dort gibt es keine Anfrage, aus der sich eine Sprache ableiten liesse.';


-- ---------------------------------------------------------------------------
-- 2. Benachrichtigungen, je Art
-- ---------------------------------------------------------------------------
--
-- ABWESENHEIT HEISST "JA".
--   Die Tabelle haelt nur Abbestellungen. Das hat zwei Gruende: Der heutige
--   Zustand - alles an - bleibt ohne eine einzige Zeile erhalten, und eine
--   spaeter dazukommende Art ist automatisch an, statt fuer alle Bestandsleute
--   stumm zu bleiben, weil niemand eine Zeile dafuer hat.
--
-- EINLADUNGEN STEHEN NICHT IN DIESER LISTE.
--   Eine Einladung IST die Nachricht; sie abzubestellen hiesse, sie nie zu
--   bekommen. Sie geht ausserdem oft an Menschen ohne Konto, fuer die es hier
--   gar keine Zeile geben koennte.
create table public.notification_opt_outs (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint notification_opt_outs_kind_check check (kind in (
    'contact_request',
    'message',
    'problem_interest',
    'connect_saved_search',
    'discovery_saved_search',
    'read_my_mind',
    'founder_in_the_wild'
  ))
);

comment on table public.notification_opt_outs is
  'Abbestellte Mailarten. Eine Zeile heisst "diese nicht"; keine Zeile heisst "ja". Einladungen stehen bewusst nicht in der Werteliste - sie sind die Nachricht selbst.';

alter table public.notification_opt_outs enable row level security;
revoke all on public.notification_opt_outs from anon, authenticated;
grant select, insert, delete on public.notification_opt_outs to authenticated;

create policy notification_opt_outs_select_self on public.notification_opt_outs
  for select to authenticated using (user_id = auth.uid());
create policy notification_opt_outs_insert_self on public.notification_opt_outs
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_opt_outs_delete_self on public.notification_opt_outs
  for delete to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Die eine Stelle, an der gefragt wird
-- ---------------------------------------------------------------------------
-- security definer, weil der Versand im Namen der AUSLOESENDEN Person laeuft -
-- die darf die Einstellungen der Empfaengerin nicht lesen, und soll es auch
-- nicht. Zurueck kommt nur ja oder nein.
create or replace function public.wants_email_notification(p_user_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and not exists (
    select 1 from public.notification_opt_outs opt_out
    where opt_out.user_id = p_user_id and opt_out.kind = p_kind
  );
$$;

comment on function public.wants_email_notification(uuid, text) is
  'Ob diese Person diese Mailart bekommen moechte. Gibt true zurueck, solange keine Abbestellung vorliegt - auch fuer eine Art, die es beim Anlegen der Zeile noch nicht gab.';

revoke all on function public.wants_email_notification(uuid, text) from public, anon;
grant execute on function public.wants_email_notification(uuid, text) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- Uebernahme des bestehenden Schalters
-- ---------------------------------------------------------------------------
--
-- NUR die drei Arten, die er wirklich geschaltet hat.
--
-- Der Schalter hiess "Benachrichtigungen aus Connect", sein Text nannte aber
-- ausdruecklich nur diese drei. Treffer gespeicherter Suchen kamen auch dann
-- an, wenn er aus war. Sie hier mit abzubestellen waere bequem - und waere
-- eine Aenderung an dem, was diese Menschen heute bekommen, ohne dass sie
-- danach gefragt wurden. Sie bleiben an und stehen ab jetzt als eigener
-- Schalter da.
insert into public.notification_opt_outs(user_id, kind)
select membership.user_id, kinds.kind
from public.network_memberships membership
cross join (values ('contact_request'), ('message'), ('problem_interest')) as kinds(kind)
where membership.email_notifications = false
on conflict do nothing;

comment on column public.network_memberships.email_notifications is
  'ABGELOEST am 18.09.2026 durch public.notification_opt_outs. Wird nicht mehr gelesen; die Spalte bleibt vorerst stehen, damit ein Rueckbau ohne Datenverlust moeglich ist.';


-- ---------------------------------------------------------------------------
-- Der Anspruch fragt jetzt die neue Stelle
-- ---------------------------------------------------------------------------
-- Unveraendert bleibt: Wer keine will, bekommt keine UND es wird kein Anspruch
-- vermerkt - sonst haenge ein spaeteres Einschalten an alten Zeilen fest und
-- die erste Mail danach bliebe aus.
create or replace function public.claim_network_notification(
  p_kind text,
  p_subject_id uuid,
  p_recipient_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.wants_email_notification(p_recipient_user_id, p_kind) then
    return false;
  end if;

  -- Die Mitgliedschaft muss weiterhin aktiv sein: Eine gesperrte Person
  -- bekommt keine Post ueber ein Netzwerk, in dem sie gerade nicht ist.
  if not exists (
    select 1 from public.network_memberships membership
    where membership.user_id = p_recipient_user_id and membership.status = 'active'
  ) then
    return false;
  end if;

  insert into public.network_notification_claims(kind, subject_id, recipient_user_id)
  values (p_kind, p_subject_id, p_recipient_user_id)
  on conflict do nothing;

  return found;
end;
$$;

commit;
