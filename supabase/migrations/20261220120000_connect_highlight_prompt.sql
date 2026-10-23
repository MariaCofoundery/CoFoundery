begin;

-- Wer wurde schon nach dem Highlight-Haekchen gefragt? Die Frage erscheint
-- einmal beim ersten Besuch von Connect (angehakt vorgewaehlt, abwaehlbar).
-- Solange nicht geantwortet ist, bleibt `highlightable` aus: Bestehende
-- Profile werden nicht stillschweigend aufgenommen, sondern gefragt.
alter table public.network_profiles
  add column if not exists highlight_prompt_answered_at timestamptz;
comment on column public.network_profiles.highlight_prompt_answered_at is
  'When the person answered (or saved the profile form with) the highlight question. Null = not asked yet; highlightable stays off until then.';

notify pgrst, 'reload schema';
commit;
