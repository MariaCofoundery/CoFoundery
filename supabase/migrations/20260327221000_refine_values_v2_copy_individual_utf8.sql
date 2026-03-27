-- Refine the active values v2 questionnaire copy:
-- - individual perspective for single-person answering
-- - proper UTF-8 umlauts and special characters
-- - no change to ids, order, clusters, or scoring logic

update public.questions
set prompt = case id
  when 'wv2_1' then 'Dein Runway liegt bei vier Monaten. Ein neuer Vertriebspartner könnte dir kurzfristig viel Umsatz bringen, arbeitet aber mit Methoden, die deine Marke spürbar mitprägen würden. Wie gehst du damit um?'
  when 'wv2_2' then 'Du kannst deinen Runway nur sichern, wenn mehrere Bestandskund:innen Jahresverträge vorab zahlen. Gleichzeitig weißt du, dass dein Produkt in zwei kritischen Punkten noch nicht stabil ist. Wie gehst du vor?'
  when 'wv2_3' then 'Ein geplanter Launch wird sich wahrscheinlich verschieben. Noch ist unklar, ob es bei wenigen Tagen bleibt oder deutlich länger dauert. Wie steuerst du die Kommunikation gegenüber betroffenen Kund:innen?'
  when 'wv2_4' then 'Eine Finanzierungsrunde zieht sich und du müsstest eventuell in wenigen Wochen einen Einstellungsstopp verhängen. Wie viel davon machst du im Team schon jetzt sichtbar?'
  when 'wv2_5' then 'Eine Person aus dem frühen Team liefert seit Monaten unter dem nötigen Niveau. Gleichzeitig hängt wichtiges Wissen an ihr und das restliche Team beobachtet genau, wie du entscheidest. Was priorisierst du?'
  when 'wv2_6' then 'Eine Produktlinie bindet zu viele Ressourcen und bremst dein Kerngeschäft. Ein Stopp würde dein Unternehmen entlasten, hätte aber für einen Teil deiner Bestandskund:innen spürbare Nachteile. Wie entscheidest du?'
  when 'wv2_7' then 'Ein großer Wachstumspartner kann dir schnell Reichweite bringen, erwartet dafür aber Maßnahmen, die deine bisherige Linie gegenüber Kund:innen deutlich verschieben würden. Wie gehst du damit um?'
  when 'wv2_8' then 'Ein aggressiver Vertriebshebel könnte dich in den nächsten drei Monaten deutlich nach vorn bringen. Gleichzeitig sind Support, Produkt und Team heute schon stark belastet. Was priorisierst du?'
  when 'wv2_9' then 'Du musst die Kosten innerhalb von acht Wochen deutlich senken. Das geht entweder über spürbare Einschnitte für viele oder über harte Maßnahmen bei wenigen. Wie priorisierst du?'
  when 'wv2_10' then 'Die Marge bricht ein und du brauchst innerhalb eines Quartals klare finanzielle Wirkung. Welche Linie verfolgst du zuerst?'
  when 'wv2_11' then 'Ein neues KI-Feature wird von Kund:innen stark nachgefragt und könnte dich sichtbar nach vorn bringen. Gleichzeitig sind Datenschutz- und Missbrauchsfragen noch nicht sauber geklärt. Wie gehst du vor?'
  when 'wv2_12' then 'Ein Enterprise-Kunde will schnell unterschreiben, wenn du mehrere Sonderanforderungen zusagst. Der Deal wäre strategisch wichtig, würde dich operativ aber stark strecken. Wie entscheidest du?'
  else prompt
end
where id in (
  'wv2_1', 'wv2_2', 'wv2_3', 'wv2_4', 'wv2_5', 'wv2_6',
  'wv2_7', 'wv2_8', 'wv2_9', 'wv2_10', 'wv2_11', 'wv2_12'
);

update public.choices
set label = case
  when question_id = 'wv2_1' and sort_order = 1 then 'Du gehst die Partnerschaft ein, wenn sie dir real Luft verschafft und du kritische Beschwerden im Nachgang sauber auffangen kannst.'
  when question_id = 'wv2_1' and sort_order = 2 then 'Du nutzt die Partnerschaft gezielt für eine Übergangsphase und koppelst sie an klare Umsatz- oder Runway-Ziele.'
  when question_id = 'wv2_1' and sort_order = 3 then 'Du prüfst die Partnerschaft nur in einem klar begrenzten Rahmen mit festen Regeln für Ansprache, Zielgruppen und Laufzeit.'
  when question_id = 'wv2_1' and sort_order = 4 then 'Du gehst die Partnerschaft nicht ein, wenn du die entstehende Außenwirkung nicht langfristig tragen willst.'

  when question_id = 'wv2_2' and sort_order = 1 then 'Du holst die Vorabzahlungen breit ein, wenn sie dein Unternehmen stabilisieren.'
  when question_id = 'wv2_2' and sort_order = 2 then 'Du holst die Vorabzahlungen ein, aber nur bei Kund:innen, die den Gegenwert kurzfristig real nutzen können.'
  when question_id = 'wv2_2' and sort_order = 3 then 'Du verschiebst das, solange die kritischen Punkte nicht sauber gelöst sind.'
  when question_id = 'wv2_2' and sort_order = 4 then 'Du gehst nur mit offener Risikolage, klaren Schutzmechanismen und kurzen Ausstiegsfenstern hinein.'

  when question_id = 'wv2_3' and sort_order = 1 then 'Du kommunizierst breit erst dann, wenn klar ist, dass der Termin wirklich kippt, um keine unnötige Verunsicherung im Markt auszulösen.'
  when question_id = 'wv2_3' and sort_order = 2 then 'Du hältst die Kommunikation zunächst eng und informierst gezielt nur Kund:innen, deren Abhängigkeit vom Termin besonders hoch ist.'
  when question_id = 'wv2_3' and sort_order = 3 then 'Du sprichst das Risiko an, sobald du die wahrscheinlichste Größenordnung und einen belastbaren Umgang damit benennen kannst.'
  when question_id = 'wv2_3' and sort_order = 4 then 'Du markierst früh, dass der Termin wackelt, damit Kund:innen ihre Planung nicht auf einer zu optimistischen Annahme aufbauen.'

  when question_id = 'wv2_4' and sort_order = 1 then 'Du sprichst das erst an, wenn Entscheidungen gefallen sind.'
  when question_id = 'wv2_4' and sort_order = 2 then 'Du hältst die Information zunächst eng und öffnest sie erst, wenn Maßnahmen wirklich näher rücken.'
  when question_id = 'wv2_4' and sort_order = 3 then 'Du machst die Unsicherheit früh offen, auch wenn das Unruhe auslöst.'
  when question_id = 'wv2_4' and sort_order = 4 then 'Du benennst die Lage, sobald du die wahrscheinlichsten Folgen und Handlungsoptionen klar sagen kannst.'

  when question_id = 'wv2_5' and sort_order = 1 then 'Du besetzt die Rolle sofort neu und organisierst die Übergabe parallel.'
  when question_id = 'wv2_5' and sort_order = 2 then 'Du trennst dich, wenn nach kurzer Klärung keine klare Wende sichtbar ist.'
  when question_id = 'wv2_5' and sort_order = 3 then 'Du gibst deutlich mehr Zeit und Schutzraum, auch wenn dich das Tempo kostet.'
  when question_id = 'wv2_5' and sort_order = 4 then 'Du setzt einen klaren Entwicklungsrahmen mit enger Unterstützung und festen Fristen.'

  when question_id = 'wv2_6' and sort_order = 1 then 'Du hältst die Produktlinie vorerst weiter, um bestehende Kund:innen nicht unter Druck zu setzen.'
  when question_id = 'wv2_6' and sort_order = 2 then 'Du fährst die Produktlinie geordnet herunter und baust einen sauberen Übergang für betroffene Kund:innen.'
  when question_id = 'wv2_6' and sort_order = 3 then 'Du stoppst die Produktlinie zügig und begrenzt die Übergangsphase klar.'
  when question_id = 'wv2_6' and sort_order = 4 then 'Du schließt sofort, wenn dadurch dein Kerngeschäft spürbar besser wird.'

  when question_id = 'wv2_7' and sort_order = 1 then 'Du nutzt den Partner konsequent, wenn er dein Wachstum deutlich beschleunigt.'
  when question_id = 'wv2_7' and sort_order = 2 then 'Du gehst die Partnerschaft ein, wenn du die größten Risiken kommunikativ und operativ begrenzen kannst.'
  when question_id = 'wv2_7' and sort_order = 3 then 'Du prüfst die Zusammenarbeit nur in einem klar begrenzten Rahmen mit festen roten Linien.'
  when question_id = 'wv2_7' and sort_order = 4 then 'Du verzichtest auf den Partner, wenn die neue Linie nicht mehr zu dem passt, wofür du stehen willst.'

  when question_id = 'wv2_8' and sort_order = 1 then 'Du lässt den Hebel liegen, bis du die größte operative Engstelle zuerst stabilisiert hast.'
  when question_id = 'wv2_8' and sort_order = 2 then 'Du öffnest den Hebel nur für ein klar definiertes Segment, das du operativ sauber tragen kannst.'
  when question_id = 'wv2_8' and sort_order = 3 then 'Du ziehst den Hebel jetzt und nimmst bewusst in Kauf, dass intern vorübergehend Prioritäten hart umgeschichtet werden müssen.'
  when question_id = 'wv2_8' and sort_order = 4 then 'Du nutzt den Hebel voll und finanzierst die Überlast notfalls über temporäre Übergangslösungen, um die Chance nicht zu verlieren.'

  when question_id = 'wv2_9' and sort_order = 1 then 'Du schneidest dort am stärksten, wo der größte finanzielle Hebel liegt.'
  when question_id = 'wv2_9' and sort_order = 2 then 'Du wählst die Maßnahme, die am schnellsten Wirkung zeigt, auch wenn sie einzelne härter trifft.'
  when question_id = 'wv2_9' and sort_order = 3 then 'Du verteilst die Last lieber breiter, damit nicht einzelne den Preis fast allein tragen.'
  when question_id = 'wv2_9' and sort_order = 4 then 'Du suchst zuerst die Lösung, die wirtschaftlich trägt und die Folgen für Betroffene am besten abfedert.'

  when question_id = 'wv2_10' and sort_order = 1 then 'Du gehst nur in Maßnahmen, die für Kund:innen und Team möglichst wenig spürbare Härte auslösen.'
  when question_id = 'wv2_10' and sort_order = 2 then 'Du kombinierst Preis-, Kosten- und Fokusmaßnahmen so, dass Wirkung entsteht, ohne eine Seite übermäßig zu belasten.'
  when question_id = 'wv2_10' and sort_order = 3 then 'Du setzt zuerst die Maßnahmen mit dem schnellsten finanziellen Effekt um.'
  when question_id = 'wv2_10' and sort_order = 4 then 'Du ziehst die härtesten, aber wirksamsten Maßnahmen zuerst, wenn sie die Lage klar drehen.'

  when question_id = 'wv2_11' and sort_order = 1 then 'Du gehst zügig in den Markt und reagierst auf problematische Nutzung dort, wo sie tatsächlich sichtbar wird.'
  when question_id = 'wv2_11' and sort_order = 2 then 'Du launchst zuerst für bestehende, gut einschätzbare Kundengruppen und ziehst die Schutzlogik parallel nach.'
  when question_id = 'wv2_11' and sort_order = 3 then 'Du startest nur als eng begrenzten Piloten mit klaren Ausschlüssen, Monitoring und manuellen Eingriffspunkten.'
  when question_id = 'wv2_11' and sort_order = 4 then 'Du verschiebst den Launch, bis die zentralen Schutzfragen geklärt und intern verantwortbar sind.'

  when question_id = 'wv2_12' and sort_order = 1 then 'Du nimmst den Deal nicht an, solange die Umsetzung operativ nicht sauber abgesichert ist.'
  when question_id = 'wv2_12' and sort_order = 2 then 'Du verhandelst den Deal nur in einem Umfang, den du mit hoher Sicherheit liefern kannst.'
  when question_id = 'wv2_12' and sort_order = 3 then 'Du nimmst den Deal an und priorisierst intern alles auf die Umsetzung dieses Kunden.'
  when question_id = 'wv2_12' and sort_order = 4 then 'Du sagst zu, wenn der Deal strategisch groß genug ist, und löst die Engpässe danach.'
  else label
end
where question_id in (
  'wv2_1', 'wv2_2', 'wv2_3', 'wv2_4', 'wv2_5', 'wv2_6',
  'wv2_7', 'wv2_8', 'wv2_9', 'wv2_10', 'wv2_11', 'wv2_12'
);
