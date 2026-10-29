begin;

-- Die eigenen Vermerke ("gesehen", "weggeklickt") sind Angaben ueber die Person.
-- Sie muessen in ihrem Datenexport stehen; der liest ueber das normale Konto und
-- braucht dafuer Leserecht auf die EIGENEN Zeilen - und nur darauf.
create policy announcement_receipts_select_own on public.announcement_receipts
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.announcement_receipts to authenticated;

commit;
