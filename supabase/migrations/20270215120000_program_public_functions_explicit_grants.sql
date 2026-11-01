-- Drei Programm-Funktionen sind bewusst ohne Anmeldung aufrufbar. Bisher hatten
-- sie das nur ueber die Supabase-Standardrechte; hier steht es ausdruecklich,
-- damit es eine Entscheidung ist und kein Nebeneffekt.
--
-- get_public_program_page(slug): liefert nur, was die Organisation selbst
--   veroeffentlicht hat (program_page_published), zu einem oeffentlichen Slug.
--   Keine Personendaten.
-- is_valid_team_program_invite(token_hash): ja/nein zu einem Token-Hash aus
--   192 Bit Zufall; nicht erratbar.
-- is_valid_team_program_code(code): ja/nein; acht Zeichen aus einem Alphabet
--   ohne verwechselbare Zeichen (rund 8 * 10^11 Moeglichkeiten), je Code
--   begrenzt durch Nutzungen und Ankuenfte. Wer den Code hat, ist eingeladen -
--   das ist sein Zweck.
-- Die Aufrufer: oeffentliche Programmseite /p/[slug] und der Login.

begin;

grant execute on function public.get_public_program_page(text) to anon;
grant execute on function public.is_valid_team_program_invite(text) to anon;
grant execute on function public.is_valid_team_program_code(text) to anon;

commit;
