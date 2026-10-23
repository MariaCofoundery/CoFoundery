begin;

-- Marias Begruessungsbrief (mit den Umgangsregeln) soll jede Person einmal
-- gelesen haben - auch wer schon laenger ein Konto hat. Deshalb KEIN Backfill:
-- Null heisst "noch nicht gezeigt", und das gilt fuer alle bestehenden Konten.
-- Wer den Einstieg neu durchlaeuft, hat den Brief dort gesehen und wird hier
-- gleich mit eingetragen.
alter table public.person_core
  add column if not exists welcome_letter_seen_at timestamptz;
comment on column public.person_core.welcome_letter_seen_at is
  'When the person confirmed the welcome letter (house rules). Null = not shown yet; deliberately not backfilled.';

notify pgrst, 'reload schema';
commit;
