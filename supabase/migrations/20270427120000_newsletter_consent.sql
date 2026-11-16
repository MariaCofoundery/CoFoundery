-- Newsletter "Aus dem Netzwerk": die Einwilligung (Entwurf 16.11.2026).
--
-- Ein Newsletter ist Werbung. Die Anmeldung zum Konto reicht dafuer nicht: Es braucht eine eigene, ausdrueckliche Wahl (ein Knopf,
-- nie vorangekreuzt) und eine Bestaetigung ueber die Mail (Double-Opt-in). Gespeichert wird, wann gefragt und wann bestaetigt wurde -
-- das ist der Nachweis. Abmelden geht jederzeit mit einem Klick, aus der Mail und aus den Einstellungen.
--
-- Stati: pending (gefragt, noch nicht bestaetigt) -> confirmed -> unsubscribed. Wer sich abgemeldet hat, bekommt nichts mehr, bis er
-- selbst wieder "Ja" sagt (dann beginnt es wieder bei pending).
begin;

create table public.newsletter_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending',
  source text not null,
  requested_at timestamptz not null default pg_catalog.now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint newsletter_subscriptions_status check (status in ('pending', 'confirmed', 'unsubscribed')),
  constraint newsletter_subscriptions_source check (source in ('welcome', 'settings', 'dashboard')),
  constraint newsletter_subscriptions_confirmed check (status <> 'confirmed' or confirmed_at is not null)
);
alter table public.newsletter_subscriptions enable row level security;
revoke all on public.newsletter_subscriptions from public, anon, authenticated;
grant select on public.newsletter_subscriptions to authenticated;
create policy newsletter_subscriptions_own_read on public.newsletter_subscriptions for select to authenticated using (user_id = auth.uid());

-- "Ja, ich moechte den Newsletter": legt die Anfrage an. true = jetzt die Bestaetigungs-Mail schicken (hoechstens eine je 10 Minuten).
create or replace function public.request_newsletter(p_source text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_row public.newsletter_subscriptions%rowtype;
  v_send boolean;
begin
  if v_me is null then raise exception 'newsletter_not_allowed' using errcode = '42501'; end if;
  if p_source not in ('welcome', 'settings', 'dashboard') then raise exception 'newsletter_invalid' using errcode = '22023'; end if;
  select * into v_row from public.newsletter_subscriptions where user_id = v_me;
  if found and v_row.status = 'confirmed' then return false; end if;
  v_send := not found or v_row.confirm_sent_at is null or v_row.status = 'unsubscribed'
            or v_row.confirm_sent_at < pg_catalog.now() - interval '10 minutes';
  insert into public.newsletter_subscriptions (user_id, status, source, requested_at, confirm_sent_at)
  values (v_me, 'pending', p_source, pg_catalog.now(), case when v_send then pg_catalog.now() else null end)
  on conflict (user_id) do update set
    status = 'pending', source = excluded.source,
    requested_at = case when public.newsletter_subscriptions.status = 'unsubscribed' then pg_catalog.now() else public.newsletter_subscriptions.requested_at end,
    confirm_sent_at = case when v_send then pg_catalog.now() else public.newsletter_subscriptions.confirm_sent_at end,
    unsubscribed_at = null;
  return v_send;
end;
$$;
revoke all on function public.request_newsletter(text) from public, anon;
grant execute on function public.request_newsletter(text) to authenticated;

-- Bestaetigen (aus dem Link in der Mail; die App prueft die Unterschrift): nur der Dienst.
create or replace function public.confirm_newsletter(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscriptions
  set status = 'confirmed', confirmed_at = pg_catalog.now(), unsubscribed_at = null
  where user_id = p_user_id and status = 'pending';
  return found;
end;
$$;
revoke all on function public.confirm_newsletter(uuid) from public, anon, authenticated;
grant execute on function public.confirm_newsletter(uuid) to service_role;

-- Abmelden aus der Mail: nur der Dienst. Aus den Einstellungen: die Person selbst.
create or replace function public.unsubscribe_newsletter(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = pg_catalog.now()
  where user_id = p_user_id and status <> 'unsubscribed';
  return found;
end;
$$;
revoke all on function public.unsubscribe_newsletter(uuid) from public, anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to service_role;

create or replace function public.stop_my_newsletter()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'newsletter_not_allowed' using errcode = '42501'; end if;
  update public.newsletter_subscriptions set status = 'unsubscribed', unsubscribed_at = pg_catalog.now()
  where user_id = auth.uid() and status <> 'unsubscribed';
  return found;
end;
$$;
revoke all on function public.stop_my_newsletter() from public, anon;
grant execute on function public.stop_my_newsletter() to authenticated;

commit;
