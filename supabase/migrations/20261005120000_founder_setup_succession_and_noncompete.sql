begin;

-- ---------------------------------------------------------------------------
-- Zwei Themen, die in jedem Gesellschaftervertrag stehen und hier fehlten
-- ---------------------------------------------------------------------------
--
-- NACHFOLGE IM TODESFALL
--   "Laengere Abwesenheit" deckt das nicht ab: Dort geht es um jemanden, der
--   wiederkommt. Stirbt eine Gruenderin, fallen ihre Anteile ohne Regelung an
--   die Erben - Menschen, die das Unternehmen nicht kennen und nicht kennen
--   wollen, und die ab dann mitentscheiden. Das ist der Standardfall, den
--   jeder Gesellschaftervertrag regelt und an den beim Gruenden niemand denkt.
--
-- WETTBEWERBSVERBOT NACH DEM AUSSCHEIDEN
--   "Nebentaetigkeiten" regelt die Zeit WAEHRENDDESSEN. Was jemand nach dem
--   Ausscheiden darf, ist eine andere Frage - und die, um die im Streitfall
--   gestritten wird.
--
-- Beide Werte muessen in ZWEI Wertelisten: an den Themen selbst und an den
-- Diskussionsbeitraegen. Ein Eintrag nur an einer Stelle liesse das Thema
-- oeffnen, aber nicht darueber schreiben.
-- ---------------------------------------------------------------------------

alter table public.founder_team_setup_items
  drop constraint founder_team_setup_items_key_check,
  add constraint founder_team_setup_items_key_check check (
    item_key in (
      'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
      'conflict_deadlock', 'equity', 'vesting', 'compensation', 'contributions_expenses',
      'personal_financial_risk', 'legal_entity', 'founder_agreements',
      'intellectual_property', 'outside_activities', 'accounts_access',
      'prolonged_absence', 'changing_commitment', 'founder_exit',
      'succession', 'post_exit_competition'
    )
  );

alter table public.founder_team_setup_discussion_entries
  drop constraint founder_team_setup_discussion_item_key_check,
  add constraint founder_team_setup_discussion_item_key_check check (
    item_key in (
      'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
      'conflict_deadlock', 'equity', 'vesting', 'compensation',
      'contributions_expenses', 'personal_financial_risk', 'legal_entity',
      'founder_agreements', 'intellectual_property', 'outside_activities',
      'accounts_access', 'prolonged_absence', 'changing_commitment', 'founder_exit',
      'succession', 'post_exit_competition'
    )
  );

commit;
