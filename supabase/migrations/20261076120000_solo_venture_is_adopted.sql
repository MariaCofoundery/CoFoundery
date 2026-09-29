begin;

-- ---------------------------------------------------------------------------
-- Ein Vorhaben, das allein begonnen wurde, wird nicht durch ein zweites ersetzt
-- ---------------------------------------------------------------------------
--
-- Seit heute kann ein Solo-Founder ein Vorhaben haben, bevor jemand dazukommt:
-- Er beantwortet Zeit, Geld und Ziele fuer etwas, das er baut, und das gehoert
-- zu einem `founder_teams`-Eintrag mit ihm als einzigem Mitglied.
--
-- DAS PROBLEM, DAS DAS ERZEUGT HAT. Wird danach eine Einladung angenommen,
-- legte der Trigger bisher ein NEUES Team an - und die Antworten des Founders
-- hingen weiter am alten. Der Vergleich haette dann auf einem Vorhaben
-- stattgefunden, zu dem eine Seite nichts gesagt hat, waehrend ihre Angaben
-- daneben lagen.
--
-- Lautlos, wie immer bei so etwas: Beide Eintraege sehen richtig aus.
--
-- ---------------------------------------------------------------------------
-- WIE ES JETZT LAEUFT - UND WO NICHT GERATEN WIRD
-- ---------------------------------------------------------------------------
--
-- Beim Annehmen einer Einladung wird gesucht, ob die EINLADENDE Person genau
-- ein Vorhaben hat, in dem sie allein ist und das noch zu keiner Beziehung
-- gehoert. Dann wird dieses uebernommen.
--
-- Genau ein Kandidat, sonst keiner. Bei zweien waere jede Wahl geraten - und
-- eine falsch gewaehlte Zusammenfuehrung haengt die Zusagen einer Person an
-- ein Vorhaben, das sie nie gemeint hat. Dann lieber ein neues Team wie
-- bisher; das Solo-Vorhaben bleibt bestehen und geht nicht verloren.
--
-- Die einladende Person und nicht die eingeladene: Wer einlaedt, baut etwas,
-- zu dem jemand dazukommt. Umgekehrt waere es eine Uebernahme.

create or replace function public.ensure_founder_team_after_invitation_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_relationship_id uuid;
  v_solo_team_id uuid;
begin
  if new.status::text = 'accepted'
     and old.status::text is distinct from 'accepted'
     and new.invitee_user_id is not null
     and new.team_context in ('pre_founder', 'existing_team') then

    select relationship.id
      into v_relationship_id
    from public.relationships relationship
    where relationship.user_low = least(new.inviter_user_id, new.invitee_user_id)
      and relationship.user_high = greatest(new.inviter_user_id, new.invitee_user_id)
    limit 1;

    if v_relationship_id is null then
      raise exception 'accepted_invitation_relationship_missing';
    end if;

    -- Genau ein Solo-Vorhaben der einladenden Person, im selben Kontext, noch
    -- an keine Beziehung gebunden. Sonst bleibt es bei null, und es entsteht
    -- ein neues Team wie bisher.
    select team.id
      into v_solo_team_id
    from public.founder_teams team
    join public.founder_team_members member on member.team_id = team.id
    where member.user_id = new.inviter_user_id
      and team.team_context = new.team_context
      and not exists (
        select 1 from public.founder_team_members other
        where other.team_id = team.id and other.user_id <> new.inviter_user_id
      )
      and not exists (
        select 1 from public.relationships bound
        where bound.founder_team_id = team.id
      )
    limit 2;

    -- `limit 2` und dann pruefen: Gibt es zwei, ist die Wahl geraten.
    if (
      select count(*)
      from public.founder_teams team
      join public.founder_team_members member on member.team_id = team.id
      where member.user_id = new.inviter_user_id
        and team.team_context = new.team_context
        and not exists (
          select 1 from public.founder_team_members other
          where other.team_id = team.id and other.user_id <> new.inviter_user_id
        )
        and not exists (
          select 1 from public.relationships bound
          where bound.founder_team_id = team.id
        )
    ) <> 1 then
      v_solo_team_id := null;
    end if;

    perform public.ensure_founder_team_for_relationship(
      v_relationship_id,
      new.team_context,
      v_solo_team_id
    );
  end if;

  return new;
end;
$$;

comment on function public.ensure_founder_team_after_invitation_acceptance() is
  'Uebernimmt ein allein begonnenes Vorhaben, statt ein zweites anzulegen - '
  'aber nur, wenn es genau eines gibt. Bei mehreren waere die Wahl geraten, '
  'und die Zusagen haengen danach an einem Vorhaben, das niemand gemeint hat.';

commit;
