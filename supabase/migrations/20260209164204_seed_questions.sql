-- Placeholder questionnaire (6 dimensions x 6 questions)
-- Replace with real content before production.

insert into public.questions (id, dimension, prompt, sort_order) values
  ('D1_Q1', 'Werte', 'Wie wichtig ist dir gemeinsame Vision?', 1),
  ('D1_Q2', 'Werte', 'Wie stark priorisierst du Wirkung vor Gewinn?', 2),
  ('D1_Q3', 'Werte', 'Wie wichtig ist dir Transparenz im Team?', 3),
  ('D1_Q4', 'Werte', 'Wie entscheidend ist dir langfristige Integritaet?', 4),
  ('D1_Q5', 'Werte', 'Wie stark erwartest du Alignment in Grundsaetzen?', 5),
  ('D1_Q6', 'Werte', 'Wie wichtig ist dir Fairness in Entscheidungen?', 6),

  ('D2_Q1', 'Arbeitsstil', 'Wie bevorzugst du Aufgaben zu strukturieren?', 7),
  ('D2_Q2', 'Arbeitsstil', 'Wie viel Autonomie brauchst du?', 8),
  ('D2_Q3', 'Arbeitsstil', 'Wie stark planst du im Voraus?', 9),
  ('D2_Q4', 'Arbeitsstil', 'Wie gehst du mit Unsicherheit um?', 10),
  ('D2_Q5', 'Arbeitsstil', 'Wie wichtig ist dir Prozessdisziplin?', 11),
  ('D2_Q6', 'Arbeitsstil', 'Wie sehr schaetzt du klare Prioritaeten?', 12),

  ('D3_Q1', 'Entscheidungen', 'Wie schnell willst du Entscheidungen treffen?', 13),
  ('D3_Q2', 'Entscheidungen', 'Wie viel Daten brauchst du fuer Entscheidungen?', 14),
  ('D3_Q3', 'Entscheidungen', 'Wie wichtig ist Konsens?', 15),
  ('D3_Q4', 'Entscheidungen', 'Wie gehst du mit Konflikten um?', 16),
  ('D3_Q5', 'Entscheidungen', 'Wie stark vertraust du Intuition?', 17),
  ('D3_Q6', 'Entscheidungen', 'Wie offen bist du fuer Richtungswechsel?', 18),

  ('D4_Q1', 'Tempo', 'Wie hoch ist dein bevorzugtes Arbeitstempo?', 19),
  ('D4_Q2', 'Tempo', 'Wie viel Druck brauchst du, um zu liefern?', 20),
  ('D4_Q3', 'Tempo', 'Wie schnell willst du iterieren?', 21),
  ('D4_Q4', 'Tempo', 'Wie gehst du mit langsamen Phasen um?', 22),
  ('D4_Q5', 'Tempo', 'Wie stark willst du Deadlines setzen?', 23),
  ('D4_Q6', 'Tempo', 'Wie sehr priorisierst du Geschwindigkeit?', 24),

  ('D5_Q1', 'Verantwortung', 'Wie stark willst du Ownership teilen?', 25),
  ('D5_Q2', 'Verantwortung', 'Wie gehst du mit Fehlern um?', 26),
  ('D5_Q3', 'Verantwortung', 'Wie klar sollen Rollen abgegrenzt sein?', 27),
  ('D5_Q4', 'Verantwortung', 'Wie wichtig ist dir Rechenschaft?', 28),
  ('D5_Q5', 'Verantwortung', 'Wie gehst du mit Risiken um?', 29),
  ('D5_Q6', 'Verantwortung', 'Wie sehr erwartest du Verbindlichkeit?', 30),

  ('D6_Q1', 'Kommunikation', 'Wie haeufig willst du Syncs haben?', 31),
  ('D6_Q2', 'Kommunikation', 'Wie direkt soll Feedback sein?', 32),
  ('D6_Q3', 'Kommunikation', 'Wie gehst du mit Spannungen um?', 33),
  ('D6_Q4', 'Kommunikation', 'Wie viel Kontext brauchst du?', 34),
  ('D6_Q5', 'Kommunikation', 'Wie wichtig ist dir Dokumentation?', 35),
  ('D6_Q6', 'Kommunikation', 'Wie sehr schaetzt du klare Sprache?', 36);

-- 4-point Likert choices for each question
insert into public.choices (question_id, label, value, sort_order)
select q.id, c.label, c.value, c.sort_order
from public.questions q
cross join (
  values
    ('Trifft gar nicht zu', '1', 1),
    ('Trifft eher nicht zu', '2', 2),
    ('Trifft eher zu', '3', 3),
    ('Trifft voll zu', '4', 4)
) as c(label, value, sort_order);
