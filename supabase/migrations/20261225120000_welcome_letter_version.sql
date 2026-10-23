begin;

-- Welche Fassung des Begruessungsbriefs eine Person bestaetigt hat. Null heisst:
-- noch keine mit Versionsnummer - das gilt fuer alle bisherigen Konten, die den
-- Brief in der ersten Fassung gesehen haben. Sie bekommen die neue einmal.
alter table public.person_core
  add column if not exists welcome_letter_version integer;
comment on column public.person_core.welcome_letter_version is
  'Version of the welcome letter the person confirmed (see welcomeLetterVersion.ts). Null = none yet.';

notify pgrst, 'reload schema';
commit;
