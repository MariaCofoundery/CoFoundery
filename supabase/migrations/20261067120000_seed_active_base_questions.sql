begin;

-- ---------------------------------------------------------------------------
-- Die Fragen, die der Code ausliefert, fehlten in der Datenbank
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 28.09.2026, nachdem Maria beim Durchklicken einen Serverfehler
-- bekam: `founder_base_question_contract_mismatch`.
--
-- DER BEFUND, und er ist groesser als die Fehlermeldung:
--
-- Eine Datenbank, die ausschliesslich aus den Migrationen dieses Repos gebaut
-- wird, enthaelt in `questions` nur die alten Kennungen D1_Q1 bis D6_Q6. Der
-- Fragebogen wird aber laengst aus der Registratur im Code ausgeliefert (36
-- aktive Items, cl_core_1 ...), und seine Antworten werden unter q01_vision_l1,
-- q07_vision_fc1 und so weiter gespeichert.
--
-- Keine einzige Migration legt diese Zeilen an. `supabase/seed.sql` ist leer
-- und sagt ausdruecklich: "Seed data is managed through timestamped
-- migrations." Das stimmt fuer diese Fragen nicht.
--
-- WAS DAS BEDEUTET: Auf einer frisch gebauten Datenbank laesst sich keine
-- einzige Antwort des aktuellen Fragebogens speichern. `assessment_answers`
-- hat einen Fremdschluessel auf `questions`, und ein Trigger prueft zusaetzlich
-- den Auswahlwert - die Probe scheitert sofort mit
-- `base_choice_value_not_found_for_question`.
--
-- Produktiv laeuft es trotzdem. Daraus folgt, dass diese Zeilen dort auf einem
-- anderen Weg hineingekommen sind als ueber dieses Repo. Genau das ist das
-- eigentliche Problem: Die Datenbank laesst sich aus dem Repo nicht
-- wiederherstellen, und niemand merkt es, solange niemand sie neu baut.
--
-- ---------------------------------------------------------------------------
-- WAS DIESE MIGRATION TUT UND WAS NICHT
-- ---------------------------------------------------------------------------
--
-- Sie legt die 36 Fragen und ihre 156 Auswahlmoeglichkeiten an, erzeugt aus
-- derselben Registratur, die der Fragebogen ausliefert.
--
-- `on conflict do nothing` - UND DAS IST DER WICHTIGSTE TEIL. Wo die Zeilen
-- schon stehen, aendert sie nichts: keinen Fragetext, keine Beschriftung,
-- keinen Wert. Eine produktive Datenbank, die sie hat, merkt von dieser
-- Migration nichts. Antworten von Menschen haengen an diesen Kennungen; sie
-- nachtraeglich zu ueberschreiben waere gefaehrlicher als die Luecke.
--
-- Die alten Zeilen D1_Q1 bis D6_Q6 bleiben ebenfalls unangetastet. Sie werden
-- nicht mehr ausgeliefert, aber es koennen alte Antworten daran haengen -
-- `on delete restrict` sagt das auch so.
--
-- `type` steht auf 'single_choice' fuer alle: Die Spalte entscheidet nicht
-- mehr, wie eine Frage dargestellt wird - das tut die Registratur im Code.
-- Die Zeile existiert, damit der Fremdschluessel haelt und der Fragetext
-- nachschlagbar ist.
-- ---------------------------------------------------------------------------

insert into public.questions (id, dimension, prompt, sort_order, category, type) values
  ('q01_vision_l1', 'Unternehmenslogik', 'Wenn ich neue Möglichkeiten für das Unternehmen bewerte, ist für mich vor allem wichtig, ob sie das Unternehmen langfristig solide aufbauen.', 1, 'basis', 'single_choice'),
  ('q07_vision_fc1', 'Unternehmenslogik', 'Welche Aussage passt eher zu dir?
A: Ich bewerte neue Möglichkeiten vor allem danach, ob sie das Unternehmen stabiler und klarer machen.
B: Ich bewerte neue Möglichkeiten vor allem danach, ob sie neue Chancen für Wachstum eröffnen.', 2, 'basis', 'single_choice'),
  ('q13_vision_s1', 'Unternehmenslogik', 'Ein Geschäftsmodell ist sauber aufgebaut, hat aber nur begrenztes Wachstumspotenzial. Wie bewertest du das eher?', 3, 'basis', 'single_choice'),
  ('q31_vision_s2', 'Unternehmenslogik', 'Eine neue Möglichkeit würde euch Zugang zu einem deutlich größeren Markt geben. Gleichzeitig würde euer Unternehmen dadurch komplexer und weniger klar. Woran würdest du zuerst prüfen, ob dieser Schritt sinnvoll ist?', 4, 'basis', 'single_choice'),
  ('q37_vision_s3', 'Unternehmenslogik', 'Ein Investor bietet euch Kapital an. Dafür müsstet ihr euch stärker auf einen größeren Markt ausrichten, und euer bisheriges Modell würde weniger fokussiert. Was entspricht am ehesten deiner ersten Tendenz?', 5, 'basis', 'single_choice'),
  ('q43_vision_s4', 'Unternehmenslogik', 'Ihr habt ein stabiles Geschäftsmodell gefunden. Dann zeigt sich ein anderer Markt mit deutlich mehr Wachstum, aber nur mit einem klaren Richtungswechsel. Wie gehst du damit eher um?', 6, 'basis', 'single_choice'),
  ('q03_decision_l1', 'Entscheidungslogik', 'Bei wichtigen Entscheidungen ist mir wichtig, dass sie gut begründet sind und sich nachvollziehen lassen.', 7, 'basis', 'single_choice'),
  ('q09_decision_fc1', 'Entscheidungslogik', 'Welche Aussage passt eher zu dir?
A: Ich entscheide lieber erst, wenn die wichtigsten Punkte geklärt sind.
B: Ich entscheide, sobald sich eine klare Richtung abzeichnet – auch wenn noch nicht alles geklärt ist.', 8, 'basis', 'single_choice'),
  ('q15_decision_s1', 'Entscheidungslogik', 'Die Fakten sprechen eher für eine Entscheidung, aber sie fühlt sich für dich noch nicht richtig an. Wie gehst du damit um?', 9, 'basis', 'single_choice'),
  ('q33_decision_s2', 'Entscheidungslogik', 'Wie gehst du mit Entscheidungen um, bei denen Zeitdruck besteht und noch Unsicherheit da ist?', 10, 'basis', 'single_choice'),
  ('q39_decision_s3', 'Entscheidungslogik', 'Eine wichtige Entscheidung steht an, aber du hast nur begrenzt Zeit, dich einzuarbeiten. Wie gehst du am ehesten vor?', 11, 'basis', 'single_choice'),
  ('q45_decision_s4', 'Entscheidungslogik', 'Nach kurzer Zeit merkst du, dass eine Entscheidung wahrscheinlich nicht trägt. Wie reagierst du?', 12, 'basis', 'single_choice'),
  ('q08_collaboration_fc1', 'Arbeitsstruktur & Zusammenarbeit', 'Welche Aussage passt eher zu deiner Art zu arbeiten?
A: Ich arbeite am liebsten eigenständig und verantworte meinen Bereich selbst.
B: Ich arbeite am liebsten eng abgestimmt mit meinem Co-Founder.', 13, 'basis', 'single_choice'),
  ('q14_collaboration_s1', 'Arbeitsstruktur & Zusammenarbeit', 'Du arbeitest an einem neuen Feature und triffst dabei mehrere wichtige Entscheidungen. Wann beziehst du deinen Co-Founder typischerweise ein?', 14, 'basis', 'single_choice'),
  ('q32_collaboration_s2', 'Arbeitsstruktur & Zusammenarbeit', 'Ihr merkt, dass ihr beide immer wieder an denselben Themen arbeitet und sich Zuständigkeiten überschneiden. Wie gehst du damit um?', 15, 'basis', 'single_choice'),
  ('q02_collaboration_l1', 'Arbeitsstruktur & Zusammenarbeit', 'Zusammenarbeit funktioniert für mich am besten, wenn wir uns früh über Zwischenstände austauschen und nicht erst am Ende.', 16, 'basis', 'single_choice'),
  ('q38_collaboration_s3', 'Arbeitsstruktur & Zusammenarbeit', 'Ihr arbeitet zu unterschiedlichen Zeiten. Wie würdest du eure Zusammenarbeit organisieren?', 17, 'basis', 'single_choice'),
  ('q44_collaboration_s4', 'Arbeitsstruktur & Zusammenarbeit', 'Ein Co-Founder arbeitet sehr eigenständig und teilt wichtige Zwischenstände erst spät. Was wäre für dich dabei passend?', 18, 'basis', 'single_choice'),
  ('q05_commitment_l1', 'Commitment', 'Das Startup nimmt aktuell einen klaren Teil meiner Zeit und Energie ein.', 19, 'basis', 'single_choice'),
  ('q11_commitment_fc1', 'Commitment', 'Welche Aussage passt eher zu dir?
A: Ich halte für das Startup einen festen, begrenzten Rahmen an Zeit und Energie ein.
B: Ich richte meine Zeit und Energie eher so aus, dass das Startup mehr Raum bekommt.', 20, 'basis', 'single_choice'),
  ('q17_commitment_s1', 'Commitment', 'Wenn andere wichtige Dinge in deinem Leben mehr Aufmerksamkeit brauchen: Wie verändert sich dann deine Priorität für das Startup?', 21, 'basis', 'single_choice'),
  ('q35_commitment_s2', 'Commitment', 'Das Startup entwickelt sich langsamer als erwartet. Ihr überlegt, wie viel Zeit und Energie ihr in den nächsten Monaten investieren wollt. Welche Haltung passt eher zu dir?', 22, 'basis', 'single_choice'),
  ('q41_commitment_s3', 'Commitment', 'Neben dem Startup kommen weitere Projekte oder Verpflichtungen dazu. Wie gehst du damit um?', 23, 'basis', 'single_choice'),
  ('q47_commitment_s4', 'Commitment', 'Der Aufbau des Startups braucht deutlich mehr Zeit als geplant. Wie gehst du damit um?', 24, 'basis', 'single_choice'),
  ('q16_risk_s1', 'Risikoorientierung', 'Der finanzielle Puffer reicht nur noch für wenige Monate. Wie gehst du mit der Situation um?', 25, 'basis', 'single_choice'),
  ('q34_risk_s2', 'Risikoorientierung', 'Wie viel persönliche Sicherheit bist du bereit für unternehmerische Chancen zu riskieren?', 26, 'basis', 'single_choice'),
  ('q04_risk_l1', 'Risikoorientierung', 'Ich kann Unsicherheit über längere Zeit gut aushalten, auch wenn nicht alles absehbar ist.', 27, 'basis', 'single_choice'),
  ('q10_risk_fc1', 'Risikoorientierung', 'Welche Aussage passt eher zu dir?
A: Ich gehe lieber Schritte, bei denen Risiken klar begrenzt sind.
B: Ich gehe auch Schritte mit höherem Risiko, wenn die Chance groß ist.', 28, 'basis', 'single_choice'),
  ('q40_risk_s3', 'Risikoorientierung', 'Ein neues Produkt könnte starten, obwohl noch Unsicherheiten bestehen. Wie gehst du damit um?', 29, 'basis', 'single_choice'),
  ('q46_risk_s4', 'Risikoorientierung', 'Eine Option bietet große Chancen, bringt aber über mehrere Monate mehr Unsicherheit mit sich. Wie gehst du damit um?', 30, 'basis', 'single_choice'),
  ('q06_conflict_l1', 'Konfliktstil', 'Wenn ich merke, dass ich mit einem Co-Founder unterschiedlich denke, kläre ich meine Sicht meist erst für mich, bevor ich es anspreche.', 31, 'basis', 'single_choice'),
  ('q18_conflict_s1', 'Konfliktstil', 'Ein Co-Founder trifft eine Entscheidung, die du anders gesehen hättest. Wie reagierst du?', 32, 'basis', 'single_choice'),
  ('q12_conflict_fc1', 'Konfliktstil', 'Welche Aussage passt eher zu dir?
A: Wenn ich widerspreche, spreche ich es eher vorsichtig an.
B: Wenn ich widerspreche, spreche ich es direkt an.', 33, 'basis', 'single_choice'),
  ('q36_conflict_s2', 'Konfliktstil', 'Wenn ein Unterschied länger bestehen bleibt: Wie gehst du damit um?', 34, 'basis', 'single_choice'),
  ('q42_conflict_s3', 'Konfliktstil', 'Ein Fehler im Unternehmen hat Folgen, und ihr seht ihn unterschiedlich. Wie sprichst du das an?', 35, 'basis', 'single_choice'),
  ('q48_conflict_s4', 'Konfliktstil', 'In einer Diskussion entsteht spürbare Spannung. Wie gehst du damit um?', 36, 'basis', 'single_choice')
on conflict (id) do nothing;

insert into public.choices (question_id, label, value, sort_order) values
  ('q01_vision_l1', 'trifft überhaupt nicht zu', '100', 1),
  ('q01_vision_l1', 'trifft eher nicht zu', '75', 2),
  ('q01_vision_l1', 'teils / teils', '50', 3),
  ('q01_vision_l1', 'trifft eher zu', '25', 4),
  ('q01_vision_l1', 'trifft voll zu', '0', 5),
  ('q07_vision_fc1', 'A trifft deutlich eher zu', '100', 1),
  ('q07_vision_fc1', 'A trifft eher zu', '75', 2),
  ('q07_vision_fc1', 'beide etwa gleich', '50', 3),
  ('q07_vision_fc1', 'B trifft eher zu', '25', 4),
  ('q07_vision_fc1', 'B trifft deutlich eher zu', '0', 5),
  ('q13_vision_s1', 'Für mich ist wichtiger, dass das Modell solide und stimmig ist.', '100', 1),
  ('q13_vision_s1', 'Für mich ist wichtig, dass beides möglichst zusammenkommt: Stabilität und Wachstum.', '67', 2),
  ('q13_vision_s1', 'Für mich ist wichtiger, dass das Modell mehr Wachstum ermöglicht.', '33', 3),
  ('q13_vision_s1', 'Für mich geht Wachstum klar vor, auch wenn das Modell noch nicht ganz stimmig ist.', '0', 4),
  ('q31_vision_s2', 'Daran, ob das Unternehmen dadurch langfristig stabil und stimmig bleibt.', '100', 1),
  ('q31_vision_s2', 'Daran, ob sich der Schritt gut in den bisherigen Aufbau des Unternehmens einfügt.', '67', 2),
  ('q31_vision_s2', 'Daran, ob der Schritt eine klare Wachstumschance eröffnet, auch wenn es komplexer wird.', '33', 3),
  ('q31_vision_s2', 'Daran, ob der Schritt die Möglichkeiten des Unternehmens deutlich vergrößert, auch wenn es breiter und weniger klar wird.', '0', 4),
  ('q37_vision_s3', 'Ich würde das eher nicht verfolgen. Wichtiger ist mir, dass das Unternehmen klar und belastbar bleibt.', '100', 1),
  ('q37_vision_s3', 'Ich würde genau prüfen, ob sich Wachstum und ein sauberer Aufbau gut verbinden lassen.', '67', 2),
  ('q37_vision_s3', 'Ich wäre offen dafür, wenn die Chance groß genug ist und wir klare Leitplanken setzen.', '33', 3),
  ('q37_vision_s3', 'Ich würde das eher verfolgen. Wenn die Chance groß ist, sollte sich das Unternehmen daran ausrichten.', '0', 4),
  ('q43_vision_s4', 'Ich würde eher bei der bisherigen Richtung bleiben, solange sie funktioniert.', '100', 1),
  ('q43_vision_s4', 'Ich würde den neuen Markt sorgfältig prüfen, bevor wir die Richtung ändern.', '67', 2),
  ('q43_vision_s4', 'Ich würde offen prüfen, ob der neue Markt langfristig die bessere Chance ist.', '33', 3),
  ('q43_vision_s4', 'Ich würde die neue Richtung aktiv verfolgen, wenn das Potenzial deutlich größer ist.', '0', 4),
  ('q03_decision_l1', 'trifft überhaupt nicht zu', '100', 1),
  ('q03_decision_l1', 'trifft eher nicht zu', '75', 2),
  ('q03_decision_l1', 'teils / teils', '50', 3),
  ('q03_decision_l1', 'trifft eher zu', '25', 4),
  ('q03_decision_l1', 'trifft voll zu', '0', 5),
  ('q09_decision_fc1', 'A trifft deutlich eher zu', '100', 1),
  ('q09_decision_fc1', 'A trifft eher zu', '75', 2),
  ('q09_decision_fc1', 'beide etwa gleich', '50', 3),
  ('q09_decision_fc1', 'B trifft eher zu', '25', 4),
  ('q09_decision_fc1', 'B trifft deutlich eher zu', '0', 5),
  ('q15_decision_s1', 'Wenn die Fakten dafür sprechen, ist die Entscheidung für mich grundsätzlich tragfähig.', '0', 1),
  ('q15_decision_s1', 'Ich würde noch einmal gezielt prüfen, warum sich beides nicht deckt.', '33', 2),
  ('q15_decision_s1', 'Für mich passt die Entscheidung erst, wenn sie sich auch richtig anfühlt.', '67', 3),
  ('q15_decision_s1', 'Solange es sich nicht richtig anfühlt, treffe ich die Entscheidung nicht.', '100', 4),
  ('q33_decision_s2', 'Ich warte lieber und kläre weiter.', '0', 1),
  ('q33_decision_s2', 'Ich kläre so viel wie möglich, bevor ich entscheide.', '33', 2),
  ('q33_decision_s2', 'Ich entscheide, sobald eine tragfähige Richtung erkennbar ist.', '67', 3),
  ('q33_decision_s2', 'Ich entscheide bewusst schnell und passe später an.', '100', 4),
  ('q39_decision_s3', 'Ich würde die Entscheidung lieber verschieben, um mehr Klarheit zu bekommen.', '0', 1),
  ('q39_decision_s3', 'Ich würde die vorhandenen Infos bündeln und dann abwägen.', '33', 2),
  ('q39_decision_s3', 'Ich würde auf Basis der tragfähigsten Hinweise entscheiden und offene Punkte später nachschärfen.', '67', 3),
  ('q39_decision_s3', 'Ich würde mich für die Richtung entscheiden, die sich am stimmigsten anfühlt, und dann weiter prüfen.', '100', 4),
  ('q45_decision_s4', 'Ich würde erst genau verstehen wollen, was nicht passt.', '0', 1),
  ('q45_decision_s4', 'Ich würde die Richtung vorsichtig anpassen und nochmal prüfen.', '33', 2),
  ('q45_decision_s4', 'Ich würde mich in Richtung der besseren Alternative bewegen.', '67', 3),
  ('q45_decision_s4', 'Ich würde die bisherige Richtung loslassen und mich neu ausrichten.', '100', 4),
  ('q08_collaboration_fc1', 'A trifft deutlich eher zu', '0', 1),
  ('q08_collaboration_fc1', 'A trifft eher zu', '25', 2),
  ('q08_collaboration_fc1', 'beide etwa gleich', '50', 3),
  ('q08_collaboration_fc1', 'B trifft eher zu', '75', 4),
  ('q08_collaboration_fc1', 'B trifft deutlich eher zu', '100', 5),
  ('q14_collaboration_s1', 'Ich entscheide in meinem Bereich meist selbstständig.', '100', 1),
  ('q14_collaboration_s1', 'Ich beziehe ihn ein, sobald ich erste klare Ergebnisse habe.', '67', 2),
  ('q14_collaboration_s1', 'Ich teile regelmäßig Zwischenstände und stimme mich punktuell ab.', '33', 3),
  ('q14_collaboration_s1', 'Ich stimme wichtige Schritte früh gemeinsam ab.', '0', 4),
  ('q32_collaboration_s2', 'Ich würde die Zuständigkeiten klarer trennen.', '100', 1),
  ('q32_collaboration_s2', 'Ich würde Rollen schärfen und nur an wichtigen Punkten abstimmen.', '67', 2),
  ('q32_collaboration_s2', 'Ich würde regelmäßige kurze Abstimmungen einführen.', '33', 3),
  ('q32_collaboration_s2', 'Ich würde die Zusammenarbeit enger abstimmen.', '0', 4),
  ('q02_collaboration_l1', 'trifft überhaupt nicht zu', '0', 1),
  ('q02_collaboration_l1', 'trifft eher nicht zu', '25', 2),
  ('q02_collaboration_l1', 'teils / teils', '50', 3),
  ('q02_collaboration_l1', 'trifft eher zu', '75', 4),
  ('q02_collaboration_l1', 'trifft voll zu', '100', 5),
  ('q38_collaboration_s3', 'Eine klare Aufgabenverteilung reicht mir.', '100', 1),
  ('q38_collaboration_s3', 'Ich würde nur an wenigen festen Punkten synchronisieren.', '67', 2),
  ('q38_collaboration_s3', 'Ich würde tägliche kurze Abstimmungsfenster einbauen.', '33', 3),
  ('q38_collaboration_s3', 'Ich würde möglichst viele Arbeitsphasen enger abstimmen.', '0', 4),
  ('q44_collaboration_s4', 'Für mich reicht es, wenn am Ende Ergebnisse geteilt werden.', '100', 1),
  ('q44_collaboration_s4', 'Für mich reicht es, wenn an ein paar Stellen sichtbar ist, wo ihr steht.', '67', 2),
  ('q44_collaboration_s4', 'Ich hätte gern regelmäßige Zwischenstände.', '33', 3),
  ('q44_collaboration_s4', 'Mir ist wichtig, früh in wichtige Entwicklungen eingebunden zu sein.', '0', 4),
  ('q05_commitment_l1', 'trifft überhaupt nicht zu', '0', 1),
  ('q05_commitment_l1', 'trifft eher nicht zu', '25', 2),
  ('q05_commitment_l1', 'teils / teils', '50', 3),
  ('q05_commitment_l1', 'trifft eher zu', '75', 4),
  ('q05_commitment_l1', 'trifft voll zu', '100', 5),
  ('q11_commitment_fc1', 'A trifft deutlich eher zu', '100', 1),
  ('q11_commitment_fc1', 'A trifft eher zu', '75', 2),
  ('q11_commitment_fc1', 'beide etwa gleich', '50', 3),
  ('q11_commitment_fc1', 'B trifft eher zu', '25', 4),
  ('q11_commitment_fc1', 'B trifft deutlich eher zu', '0', 5),
  ('q17_commitment_s1', 'Ich halte meine Grenzen auch dann klar ein.', '0', 1),
  ('q17_commitment_s1', 'Ich passe meine Priorität nur leicht an.', '33', 2),
  ('q17_commitment_s1', 'Ich gebe dem Startup in solchen Phasen mehr Raum.', '67', 3),
  ('q17_commitment_s1', 'Das Startup hat dann klar Vorrang.', '100', 4),
  ('q35_commitment_s2', 'Ich würde meinen bisherigen Zeitrahmen beibehalten.', '0', 1),
  ('q35_commitment_s2', 'Ich würde etwas mehr Zeit investieren, aber mit klaren Grenzen.', '33', 2),
  ('q35_commitment_s2', 'Ich würde das Startup vorübergehend höher priorisieren.', '67', 3),
  ('q35_commitment_s2', 'Ich würde in dieser Phase einen großen Teil meiner Zeit darauf ausrichten.', '100', 4),
  ('q41_commitment_s3', 'Das ist für mich gut vereinbar, solange alles seinen festen Platz hat.', '0', 1),
  ('q41_commitment_s3', 'Das passt für mich, solange klar ist, wie ich meine Zeit aufteile.', '33', 2),
  ('q41_commitment_s3', 'Ich würde bewusst klären, wann das Startup mehr Raum bekommt.', '67', 3),
  ('q41_commitment_s3', 'Mir ist wichtig, dass das Startup in wichtigen Phasen klar Vorrang hat.', '100', 4),
  ('q47_commitment_s4', 'Ich bleibe bei meinen bisherigen zeitlichen Grenzen.', '0', 1),
  ('q47_commitment_s4', 'Ich erhöhe meinen Einsatz nur begrenzt.', '33', 2),
  ('q47_commitment_s4', 'Ich ordne meine Prioritäten vorübergehend neu.', '67', 3),
  ('q47_commitment_s4', 'Ich gebe dem Startup in dieser Phase deutlich mehr Raum.', '100', 4),
  ('q16_risk_s1', 'Ich würde zuerst versuchen, das Risiko möglichst zu begrenzen.', '0', 1),
  ('q16_risk_s1', 'Ich würde nur Schritte gehen, bei denen die Unsicherheit überschaubar bleibt.', '33', 2),
  ('q16_risk_s1', 'Ich könnte auch mehr Unsicherheit akzeptieren, wenn sich eine Chance ergibt.', '67', 3),
  ('q16_risk_s1', 'Ich wäre bereit, deutlich mehr Unsicherheit einzugehen, um eine Wende zu schaffen.', '100', 4),
  ('q34_risk_s2', 'Ich möchte mein persönliches Risiko möglichst gering halten.', '0', 1),
  ('q34_risk_s2', 'Ich bin zu etwas mehr Risiko bereit, aber nur mit klaren Grenzen.', '33', 2),
  ('q34_risk_s2', 'Ich bin bereit, spürbares persönliches Risiko zu tragen.', '67', 3),
  ('q34_risk_s2', 'Ich bin auch zu deutlich höherem Risiko bereit, wenn die Chance groß ist.', '100', 4),
  ('q04_risk_l1', 'trifft überhaupt nicht zu', '0', 1),
  ('q04_risk_l1', 'trifft eher nicht zu', '25', 2),
  ('q04_risk_l1', 'teils / teils', '50', 3),
  ('q04_risk_l1', 'trifft eher zu', '75', 4),
  ('q04_risk_l1', 'trifft voll zu', '100', 5),
  ('q10_risk_fc1', 'A trifft deutlich eher zu', '100', 1),
  ('q10_risk_fc1', 'A trifft eher zu', '75', 2),
  ('q10_risk_fc1', 'beide etwa gleich', '50', 3),
  ('q10_risk_fc1', 'B trifft eher zu', '25', 4),
  ('q10_risk_fc1', 'B trifft deutlich eher zu', '0', 5),
  ('q40_risk_s3', 'Ich würde erst möglichst viele Unsicherheiten klären.', '0', 1),
  ('q40_risk_s3', 'Ich wäre nur dabei, wenn die Risiken gut überschaubar sind.', '33', 2),
  ('q40_risk_s3', 'Ich könnte auch mit offenen Unsicherheiten starten.', '67', 3),
  ('q40_risk_s3', 'Ich würde auch mit hoher Unsicherheit starten, wenn die Chance passt.', '100', 4),
  ('q46_risk_s4', 'Ich würde sie nur verfolgen, wenn die Risiken klar begrenzt sind.', '0', 1),
  ('q46_risk_s4', 'Ich würde sie nur mit klaren Sicherungen angehen.', '33', 2),
  ('q46_risk_s4', 'Ich könnte die zusätzliche Unsicherheit akzeptieren.', '67', 3),
  ('q46_risk_s4', 'Ich würde sie trotz hoher Unsicherheit verfolgen, wenn die Chance groß ist.', '100', 4),
  ('q06_conflict_l1', 'trifft überhaupt nicht zu', '100', 1),
  ('q06_conflict_l1', 'trifft eher nicht zu', '75', 2),
  ('q06_conflict_l1', 'teils / teils', '50', 3),
  ('q06_conflict_l1', 'trifft eher zu', '25', 4),
  ('q06_conflict_l1', 'trifft voll zu', '0', 5),
  ('q18_conflict_s1', 'Ich würde das erst für mich einordnen und beobachten.', '0', 1),
  ('q18_conflict_s1', 'Ich würde es später ansprechen, wenn ich meine Sicht klar habe.', '33', 2),
  ('q18_conflict_s1', 'Ich würde es relativ zeitnah ansprechen.', '67', 3),
  ('q18_conflict_s1', 'Ich würde es direkt ansprechen.', '100', 4),
  ('q12_conflict_fc1', 'A trifft deutlich eher zu', '0', 1),
  ('q12_conflict_fc1', 'A trifft eher zu', '25', 2),
  ('q12_conflict_fc1', 'beide etwa gleich', '50', 3),
  ('q12_conflict_fc1', 'B trifft eher zu', '75', 4),
  ('q12_conflict_fc1', 'B trifft deutlich eher zu', '100', 5),
  ('q36_conflict_s2', 'Ich lasse ihn erst stehen und sortiere weiter.', '0', 1),
  ('q36_conflict_s2', 'Ich spreche ihn später in einem passenden Moment an.', '33', 2),
  ('q36_conflict_s2', 'Ich spreche ihn aktiv wieder an.', '67', 3),
  ('q36_conflict_s2', 'Ich kläre ihn möglichst direkt weiter.', '100', 4),
  ('q42_conflict_s3', 'Ich spreche es eher mit etwas Abstand an.', '0', 1),
  ('q42_conflict_s3', 'Ich suche einen passenden Moment und spreche es vorsichtig an.', '33', 2),
  ('q42_conflict_s3', 'Ich spreche den Unterschied relativ zeitnah an.', '67', 3),
  ('q42_conflict_s3', 'Ich spreche ihn direkt an.', '100', 4),
  ('q48_conflict_s4', 'Ich nehme eher Tempo raus und sortiere erst.', '0', 1),
  ('q48_conflict_s4', 'Ich lasse es kurz abkühlen und komme später darauf zurück.', '33', 2),
  ('q48_conflict_s4', 'Ich spreche den Unterschied trotzdem an.', '67', 3),
  ('q48_conflict_s4', 'Ich gehe direkt weiter in die Klärung, auch bei Spannung.', '100', 4)
on conflict do nothing;

commit;
