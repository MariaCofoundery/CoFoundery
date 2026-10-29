begin;

-- Die Tabelle hat seit connect_hygiene keine UPDATE-Rechte fuer Angemeldete
-- mehr; Aenderungen laufen ueber schmale Funktionen (wie
-- dismiss_connect_suggestion). Diese hier setzt nur seen_at, nur bei den
-- eigenen, offenen, noch ungesehenen Zeilen, und nimmt keine Kennungen an.
create function public.mark_connect_suggestions_seen()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  update public.connect_suggestions
     set seen_at = now()
   where recipient_user_id = auth.uid()
     and dismissed_at is null
     and seen_at is null;
end;
$$;

comment on function public.mark_connect_suggestions_seen() is
  'Setzt seen_at bei den eigenen offenen Vorschlaegen. Nur eine Anzeigeangabe fuer die Zahl in der Navigation.';

revoke all on function public.mark_connect_suggestions_seen() from public, anon;
grant execute on function public.mark_connect_suggestions_seen() to authenticated;

notify pgrst, 'reload schema';

commit;
