begin;

-- ---------------------------------------------------------------------------
-- Welche Fassung gilt fuer eine Einladung?
-- ---------------------------------------------------------------------------
--
-- DIE EINLADENDE PERSON ENTSCHEIDET. Wer eingeladen wird, soll am Ende etwas
-- Gemeinsames mit der einladenden Person haben - und etwas Gemeinsames
-- entsteht nur zwischen zwei Menschen, die denselben Bogen ausgefuellt haben.
-- Wer mit der bisherigen Fassung einlaedt, schickt deshalb auch die andere
-- Person dorthin; wer keine hat, fuehrt sie in die neuen Boegen.
--
-- Bis zum 30.09.2026 fuehrte jede Einladung in die bisherige Fassung, auch
-- zwischen zwei Menschen, die beide gerade erst angekommen waren.
--
-- ---------------------------------------------------------------------------
-- WARUM EINE FUNKTION UND KEIN EINFACHES SELECT
-- ---------------------------------------------------------------------------
--
-- Die Frage lautet: Hat die EINLADENDE Person die bisherige Fassung? Gestellt
-- wird sie von der eingeladenen - und die darf fremde `assessments`-Zeilen
-- nicht lesen, zu Recht. Die Funktion beantwortet genau diese eine Frage mit
-- ja oder nein und gibt nichts weiter heraus: keine Antworten, keine
-- Zeitpunkte, keinen Fortschritt.
--
-- Sie prueft dieselbe Sichtbarkeit wie die Zeilensicherheit der Einladung
-- selbst. Wer die Einladung nicht sehen darf, bekommt `null` - und nicht
-- `false`, das waere eine Auskunft.
--
-- Die Kennung des Instruments kommt als Parameter. Sie steht in TypeScript
-- (`CURRENT_INSTRUMENT_ID`), und eine zweite Schreibweise hier waere eine
-- zweite Wahrheit, die beim naechsten Umbenennen stillschweigend falsch wird.

create or replace function public.invitation_uses_previous_version(
  p_invitation uuid,
  p_instrument text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_inviter uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select i.inviter_user_id into v_inviter
  from public.invitations i
  where i.id = p_invitation
    and (
      i.inviter_user_id = auth.uid()
      or i.invitee_user_id = auth.uid()
      -- Die Einladung kann noch auf eine Adresse lauten und nicht auf ein
      -- Konto: Genau dann steht die Person davor und fragt.
      or lower(i.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );

  if v_inviter is null then
    return null;
  end if;

  return exists (
    select 1
    from public.assessments a
    where a.user_id = v_inviter
      and a.instrument_id = p_instrument
  );
end;
$$;

comment on function public.invitation_uses_previous_version(uuid, text) is
  'Sagt, ob die einladende Person die uebergebene Fassung ueberhaupt hat - '
  'und damit, wohin die eingeladene Person gefuehrt wird. Gibt null zurueck, '
  'wenn die aufrufende Person die Einladung nicht sehen darf.';

revoke all on function public.invitation_uses_previous_version(uuid, text) from public, anon;
grant execute on function public.invitation_uses_previous_version(uuid, text) to authenticated;

commit;
