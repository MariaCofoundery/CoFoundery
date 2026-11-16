-- Newsletter: die Willkommensmail (Entwurf 16.11.2026).
--
-- Genau eine Mail, einmal, direkt nach der Bestaetigung. Damit sie nie doppelt rausgeht (zweiter Klick, Abmelden und neu anmelden),
-- steht auf der Zeile, wann sie verschickt wurde. Wer schon bestaetigt hat, bekommt sie NICHT automatisch nachgereicht: Die Spalte wird
-- fuer diese Zeilen jetzt gefuellt. Ein Nachversand waere eine eigene, bewusste Entscheidung.
begin;

alter table public.newsletter_subscriptions add column welcome_sent_at timestamptz;

update public.newsletter_subscriptions
set welcome_sent_at = coalesce(confirmed_at, pg_catalog.now())
where confirmed_at is not null;

-- Vormerken: true = diese Person bekommt die Mail jetzt (und kein anderer Aufruf mehr). Nur der Dienst.
create or replace function public.claim_newsletter_welcome(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscriptions set welcome_sent_at = pg_catalog.now()
  where user_id = p_user_id and status = 'confirmed' and welcome_sent_at is null;
  return found;
end;
$$;
revoke all on function public.claim_newsletter_welcome(uuid) from public, anon, authenticated;
grant execute on function public.claim_newsletter_welcome(uuid) to service_role;

-- Scheitert der Versand, wird das Vormerken zurueckgenommen, damit ein spaeterer Versuch moeglich bleibt.
create or replace function public.release_newsletter_welcome(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_subscriptions set welcome_sent_at = null where user_id = p_user_id;
  return found;
end;
$$;
revoke all on function public.release_newsletter_welcome(uuid) from public, anon, authenticated;
grant execute on function public.release_newsletter_welcome(uuid) to service_role;

commit;
