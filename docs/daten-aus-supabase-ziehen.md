# Antworten aus Supabase ziehen

**Anlass:** Maria am 28.09.2026: *„Die Fragen lasse ich mal testen … vor allem
wenn dann Textdaten vorliegen. Kann ich diese aus Supabase ziehen?"*

---

## Kurz: ja, technisch vollständig

Im SQL-Editor der Supabase-Konsole bist du Eigentümerin des Projekts. Die
Row-Level-Security, die im Produkt jede Zeile schützt, **gilt dort nicht** —
du siehst alles, auch Gehaltsbedarf, Verlustgrenzen und selbst benannte
Grenzen. Jede Abfrage lässt sich als CSV herunterladen.

Die Frage ist deshalb nicht, ob es geht, sondern **worunter**.

## Die Vorbedingung, die noch fehlt

Im Produkt gibt es bereits eine Forschungs-Einwilligung
(`research_consent_preferences` mit `accepted_at`, `declined_at`,
`withdrawn_at`) und eine pseudonyme `research_subject_id`. Gebaut für genau
diesen Fall.

**Die v2-Antworten hängen an keiner von beiden.** Nichts an einer
`alignment_answers`-Zeile sagt, ob die Person einverstanden war, dass ihre
Antworten zur Prüfung des Fragebogens ausgewertet werden.

Das Gutachten ist an der Stelle deutlich (Teil F7): *„Eine Freigabe von
Ergebnissen darf nicht als Einverständnis zu Investor-Screening oder
Auswahlentscheidungen umgedeutet werden."* Dasselbe gilt für die Auswertung
zur Instrumentenprüfung: Wer den Fragebogen ausfüllt, um mit seinem Mitgründer
zu sprechen, hat damit nicht zugestimmt, Teil einer Erprobung zu sein.

**Vor dem ersten echten Test wäre also zu klären:** Bekommen die Testpersonen
die Einwilligungsfrage vorgelegt, und wird die Antwort an den Fragebogen
gebunden? Das ist ein kleiner Umbau — die Mechanik ist da —, aber er gehört
vor die Erhebung und nicht danach.

## Für die Fragen-Erprobung brauchst du gar keine Personendaten

Deine eigentliche Frage ist, ob die Fragen taugen. Dafür genügen
**Verteilungen** — wer was geantwortet hat, ist dafür gleichgültig.

### Verteilung je Frage (das ist die wichtigste)

```sql
with abgegeben as (
  select answer.block_id, answer.value, answer.missing_code
  from public.alignment_answers answer
  join public.assessments a on a.id = answer.assessment_id
  where a.instrument_id = 'founder-alignment-v2'
    and a.submitted_at is not null
)
select block_id,
       count(*)                                                   as n,
       count(*) filter (where value ->> 'scale' = '1')             as s1,
       count(*) filter (where value ->> 'scale' = '2')             as s2,
       count(*) filter (where value ->> 'scale' = '3')             as s3,
       count(*) filter (where value ->> 'scale' = '4')             as s4,
       count(*) filter (where value ->> 'scale' = '5')             as s5,
       round(100.0 * count(*) filter (where value ->> 'scale' in ('4','5'))
             / nullif(count(*) filter (where value ? 'scale'), 0)) as pct_oben,
       count(*) filter (where missing_code = 'undecided')          as noch_offen,
       count(*) filter (where missing_code = 'cannot_assess')      as unklar,
       count(*) filter (where missing_code = 'withheld')           as nicht_gesagt
from abgegeben
group by block_id
order by block_id;
```

**Wie du sie liest:**

- **`pct_oben` über etwa 80** — Deckeneffekt. Fast alle antworten hoch, die
  Frage unterscheidet niemanden. Genau der Verdacht bei E03, U01, K02, D04
  und I01 aus der Durchsicht; diese Spalte belegt oder widerlegt ihn.
- **`s1` und `s5` zusammen fast alles, die Mitte leer** — die Frage wird als
  Ja/Nein gelesen. Dann liegt es an der Formulierung, nicht an der Skala.
- **`unklar` hoch** — die Frage wird nicht verstanden. Das ist der direkteste
  Hinweis auf eine schlechte Formulierung, den es gibt.
- **`noch_offen` hoch** — kein Mangel. Das ist ein Befund über die Menschen
  (sie haben es noch nicht entschieden), nicht über die Frage.

### Freitexte

```sql
select answer.block_id, answer.value ->> 'text' as text, answer.answered_at
from public.alignment_answers answer
join public.assessments a on a.id = answer.assessment_id
where a.instrument_id = 'founder-alignment-v2'
  and a.submitted_at is not null
  and answer.value ? 'text'
order by answer.block_id, answer.answered_at;
```

**Hier gilt die Einwilligungsfrage von oben besonders.** Freitexte sind nicht
anonym, auch wenn kein Name danebensteht — „ich brauche ab März 2400 Euro,
weil meine Frau in Elternzeit geht" identifiziert eine Person. L01 bis L03
(die selbst benannten Grenzen) sind die empfindlichsten Felder im ganzen
Instrument.

### Was zur Besprechung markiert wurde

```sql
select answer.block_id,
       count(*) filter (where answer.marked_for_discussion) as markiert,
       count(*)                                             as insgesamt
from public.alignment_answers answer
join public.assessments a on a.id = answer.assessment_id
where a.instrument_id = 'founder-alignment-v2' and a.submitted_at is not null
group by answer.block_id
order by markiert desc;
```

Eine oft markierte Frage ist ein gutes Zeichen — sie trifft etwas. Eine nie
markierte könnte belanglos sein.

## Was ich vorschlagen würde

1. **Vor der Erhebung:** die Einwilligung an v2 binden. Die Mechanik existiert.
2. **Während der Erhebung:** nichts ziehen. Verteilungen bei fünf Personen
   sagen nichts, verleiten aber zu Schlüssen.
3. **Danach:** mit der ersten Abfrage anfangen. `pct_oben` und `unklar`
   beantworten deine Ausgangsfrage direkter als jeder Freitext.

Wenn du magst, baue ich die erste Abfrage als Seite im Produkt — dann musst du
nicht in die Supabase-Konsole. Aber erst nach der Einwilligung, nicht davor.
