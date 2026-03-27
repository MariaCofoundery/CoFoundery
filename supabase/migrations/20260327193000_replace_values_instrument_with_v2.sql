-- Replace the legacy ten-question values add-on with the twelve-question v2 instrument.
-- Old values questions remain in the database for auditability, but are no longer active.

update public.questions
set is_active = false
where category = 'values';

delete from public.choices
where question_id like 'wv2_%';

delete from public.questions
where id like 'wv2_%';

insert into public.questions (
  id,
  dimension,
  prompt,
  sort_order,
  is_active,
  category,
  type
) values
  (
    'wv2_1',
    'Werte & Ethik',
    'Euer Runway liegt bei vier Monaten. Ein neuer Vertriebspartner koennte euch kurzfristig viel Umsatz bringen, arbeitet aber mit Methoden, die eure Marke spuerbar mitpraegen wuerden. Wie geht ihr damit um?',
    37,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_2',
    'Werte & Ethik',
    'Ihr koennt euren Runway nur sichern, wenn mehrere Bestandskund:innen Jahresvertraege vorab zahlen. Gleichzeitig wisst ihr, dass euer Produkt in zwei kritischen Punkten noch nicht stabil ist. Wie geht ihr vor?',
    38,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_3',
    'Werte & Ethik',
    'Ein geplanter Launch wird sich wahrscheinlich verschieben. Noch ist unklar, ob es bei wenigen Tagen bleibt oder deutlich laenger dauert. Wie steuert ihr die Kommunikation gegenueber betroffenen Kund:innen?',
    39,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_4',
    'Werte & Ethik',
    'Eine Finanzierungsrunde zieht sich und ihr muesst eventuell in wenigen Wochen einen Einstellungsstopp verhaengen. Wie viel davon macht ihr im Team schon jetzt sichtbar?',
    40,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_5',
    'Werte & Ethik',
    'Eine Person aus dem fruehen Team liefert seit Monaten unter dem noetigen Niveau. Gleichzeitig haengt wichtiges Wissen an ihr und das restliche Team beobachtet genau, wie ihr entscheidet. Was priorisiert ihr?',
    41,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_6',
    'Werte & Ethik',
    'Eine Produktlinie bindet zu viele Ressourcen und bremst euer Kerngeschaeft. Ein Stopp wuerde das Unternehmen entlasten, haette aber fuer einen Teil eurer Bestandskund:innen spuerbare Nachteile. Wie entscheidet ihr?',
    42,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_7',
    'Werte & Ethik',
    'Ein grosser Wachstumspartner kann euch schnell Reichweite bringen, erwartet dafuer aber Massnahmen, die eure bisherige Linie gegenueber Kund:innen deutlich verschieben wuerden. Wie geht ihr damit um?',
    43,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_8',
    'Werte & Ethik',
    'Ein aggressiver Vertriebshebel koennte euch in den naechsten drei Monaten deutlich nach vorn bringen. Gleichzeitig sind Support, Produkt und Team heute schon stark belastet. Was priorisiert ihr?',
    44,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_9',
    'Werte & Ethik',
    'Ihr muesst die Kosten innerhalb von acht Wochen deutlich senken. Das geht entweder ueber spuerbare Einschnitte fuer viele oder ueber harte Massnahmen bei wenigen. Wie priorisiert ihr?',
    45,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_10',
    'Werte & Ethik',
    'Die Marge bricht ein und ihr braucht innerhalb eines Quartals klare finanzielle Wirkung. Welche Linie verfolgt ihr zuerst?',
    46,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_11',
    'Werte & Ethik',
    'Ein neues KI-Feature wird von Kund:innen stark nachgefragt und koennte euch sichtbar nach vorn bringen. Gleichzeitig sind Datenschutz- und Missbrauchsfragen noch nicht sauber geklaert. Wie geht ihr vor?',
    47,
    true,
    'values',
    'scenario'
  ),
  (
    'wv2_12',
    'Werte & Ethik',
    'Ein Enterprise-Kunde will schnell unterschreiben, wenn ihr mehrere Sonderanforderungen zusagt. Der Deal waere strategisch wichtig, wuerde euch operativ aber stark strecken. Wie entscheidet ihr?',
    48,
    true,
    'values',
    'scenario'
  );

insert into public.choices (question_id, label, value, sort_order) values
  (
    'wv2_1',
    'Wir gehen die Partnerschaft ein, wenn sie uns real Luft verschafft und wir kritische Beschwerden im Nachgang sauber auffangen koennen.',
    '1',
    1
  ),
  (
    'wv2_1',
    'Wir nutzen die Partnerschaft gezielt fuer eine Uebergangsphase und koppeln sie an klare Umsatz- oder Runway-Ziele.',
    '2',
    2
  ),
  (
    'wv2_1',
    'Wir pruefen die Partnerschaft nur in einem klar begrenzten Rahmen mit festen Regeln fuer Ansprache, Zielgruppen und Laufzeit.',
    '3',
    3
  ),
  (
    'wv2_1',
    'Wir gehen die Partnerschaft nicht ein, wenn wir die entstehende Aussenwirkung nicht langfristig tragen wollen.',
    '4',
    4
  ),
  (
    'wv2_2',
    'Wir holen die Vorabzahlungen breit ein, wenn sie das Unternehmen stabilisieren.',
    '1',
    1
  ),
  (
    'wv2_2',
    'Wir holen die Vorabzahlungen ein, aber nur bei Kund:innen, die den Gegenwert kurzfristig real nutzen koennen.',
    '2',
    2
  ),
  (
    'wv2_2',
    'Wir verschieben das, solange die kritischen Punkte nicht sauber geloest sind.',
    '3',
    3
  ),
  (
    'wv2_2',
    'Wir gehen nur mit offener Risikolage, klaren Schutzmechanismen und kurzen Ausstiegsfenstern hinein.',
    '4',
    4
  ),
  (
    'wv2_3',
    'Wir kommunizieren breit erst dann, wenn klar ist, dass der Termin wirklich kippt, um keine unnoetige Verunsicherung im Markt auszuloesen.',
    '1',
    1
  ),
  (
    'wv2_3',
    'Wir halten die Kommunikation zunaechst eng und informieren gezielt nur Kund:innen, deren Abhaengigkeit vom Termin besonders hoch ist.',
    '2',
    2
  ),
  (
    'wv2_3',
    'Wir sprechen das Risiko an, sobald wir die wahrscheinlichste Groessenordnung und einen belastbaren Umgang damit benennen koennen.',
    '3',
    3
  ),
  (
    'wv2_3',
    'Wir markieren frueh, dass der Termin wackelt, damit Kund:innen ihre Planung nicht auf einer zu optimistischen Annahme aufbauen.',
    '4',
    4
  ),
  (
    'wv2_4',
    'Wir sprechen das erst an, wenn Entscheidungen gefallen sind.',
    '1',
    1
  ),
  (
    'wv2_4',
    'Wir halten die Information zunaechst eng und oeffnen sie erst, wenn Massnahmen wirklich naeher ruecken.',
    '2',
    2
  ),
  (
    'wv2_4',
    'Wir machen die Unsicherheit frueh offen, auch wenn das Unruhe ausloest.',
    '3',
    3
  ),
  (
    'wv2_4',
    'Wir benennen die Lage, sobald wir die wahrscheinlichsten Folgen und Handlungsoptionen klar sagen koennen.',
    '4',
    4
  ),
  (
    'wv2_5',
    'Wir besetzen die Rolle sofort neu und organisieren die Uebergabe parallel.',
    '1',
    1
  ),
  (
    'wv2_5',
    'Wir trennen uns, wenn nach kurzer Klaerung keine klare Wende sichtbar ist.',
    '2',
    2
  ),
  (
    'wv2_5',
    'Wir geben deutlich mehr Zeit und Schutzraum, auch wenn uns das Tempo kostet.',
    '3',
    3
  ),
  (
    'wv2_5',
    'Wir setzen einen klaren Entwicklungsrahmen mit enger Unterstuetzung und festen Fristen.',
    '4',
    4
  ),
  (
    'wv2_6',
    'Wir halten die Produktlinie vorerst weiter, um bestehende Kund:innen nicht unter Druck zu setzen.',
    '1',
    1
  ),
  (
    'wv2_6',
    'Wir fahren die Produktlinie geordnet herunter und bauen einen sauberen Uebergang fuer betroffene Kund:innen.',
    '2',
    2
  ),
  (
    'wv2_6',
    'Wir stoppen die Produktlinie zuegig und begrenzen die Uebergangsphase klar.',
    '3',
    3
  ),
  (
    'wv2_6',
    'Wir schliessen sofort, wenn dadurch das Kerngeschaeft spuerbar besser wird.',
    '4',
    4
  ),
  (
    'wv2_7',
    'Wir nutzen den Partner konsequent, wenn er unser Wachstum deutlich beschleunigt.',
    '1',
    1
  ),
  (
    'wv2_7',
    'Wir gehen die Partnerschaft ein, wenn wir die groessten Risiken kommunikativ und operativ begrenzen koennen.',
    '2',
    2
  ),
  (
    'wv2_7',
    'Wir pruefen die Zusammenarbeit nur in einem klar begrenzten Rahmen mit festen roten Linien.',
    '3',
    3
  ),
  (
    'wv2_7',
    'Wir verzichten auf den Partner, wenn die neue Linie nicht mehr zu dem passt, wofuer wir stehen wollen.',
    '4',
    4
  ),
  (
    'wv2_8',
    'Wir lassen den Hebel liegen, bis wir die groesste operative Engstelle zuerst stabilisiert haben.',
    '1',
    1
  ),
  (
    'wv2_8',
    'Wir oeffnen den Hebel nur fuer ein klar definiertes Segment, das wir operativ sauber tragen koennen.',
    '2',
    2
  ),
  (
    'wv2_8',
    'Wir ziehen den Hebel jetzt und nehmen bewusst in Kauf, dass intern voruebergehend Prioritaeten hart umgeschichtet werden muessen.',
    '3',
    3
  ),
  (
    'wv2_8',
    'Wir nutzen den Hebel voll und finanzieren die Ueberlast notfalls ueber temporaere Uebergangsloesungen, um die Chance nicht zu verlieren.',
    '4',
    4
  ),
  (
    'wv2_9',
    'Wir schneiden dort am staerksten, wo der groesste finanzielle Hebel liegt.',
    '1',
    1
  ),
  (
    'wv2_9',
    'Wir waehlen die Massnahme, die am schnellsten Wirkung zeigt, auch wenn sie einzelne haerter trifft.',
    '2',
    2
  ),
  (
    'wv2_9',
    'Wir verteilen die Last lieber breiter, damit nicht einzelne den Preis fast allein tragen.',
    '3',
    3
  ),
  (
    'wv2_9',
    'Wir suchen zuerst die Loesung, die wirtschaftlich traegt und die Folgen fuer Betroffene am besten abfedert.',
    '4',
    4
  ),
  (
    'wv2_10',
    'Wir gehen nur in Massnahmen, die fuer Kund:innen und Team moeglichst wenig spuerbare Haerte ausloesen.',
    '1',
    1
  ),
  (
    'wv2_10',
    'Wir kombinieren Preis-, Kosten- und Fokusmassnahmen so, dass Wirkung entsteht, ohne eine Seite uebermaessig zu belasten.',
    '2',
    2
  ),
  (
    'wv2_10',
    'Wir setzen zuerst die Massnahmen mit dem schnellsten finanziellen Effekt um.',
    '3',
    3
  ),
  (
    'wv2_10',
    'Wir ziehen die haertesten, aber wirksamsten Massnahmen zuerst, wenn sie die Lage klar drehen.',
    '4',
    4
  ),
  (
    'wv2_11',
    'Wir gehen zuegig in den Markt und reagieren auf problematische Nutzung dort, wo sie tatsaechlich sichtbar wird.',
    '1',
    1
  ),
  (
    'wv2_11',
    'Wir launchen zuerst fuer bestehende, gut einschaetzbare Kundengruppen und ziehen die Schutzlogik parallel nach.',
    '2',
    2
  ),
  (
    'wv2_11',
    'Wir starten nur als eng begrenzten Piloten mit klaren Ausschluessen, Monitoring und manuellen Eingriffspunkten.',
    '3',
    3
  ),
  (
    'wv2_11',
    'Wir verschieben den Launch, bis die zentralen Schutzfragen geklaert und intern verantwortbar sind.',
    '4',
    4
  ),
  (
    'wv2_12',
    'Wir nehmen den Deal nicht an, solange die Umsetzung operativ nicht sauber abgesichert ist.',
    '1',
    1
  ),
  (
    'wv2_12',
    'Wir verhandeln den Deal nur in einem Umfang, den wir mit hoher Sicherheit liefern koennen.',
    '2',
    2
  ),
  (
    'wv2_12',
    'Wir nehmen den Deal an und priorisieren intern alles auf die Umsetzung dieses Kunden.',
    '3',
    3
  ),
  (
    'wv2_12',
    'Wir sagen zu, wenn der Deal strategisch gross genug ist, und loesen die Engpaesse danach.',
    '4',
    4
  );
