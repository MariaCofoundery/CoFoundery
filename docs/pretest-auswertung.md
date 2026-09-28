# Was der Pretest misst — und wie du es ausliest

**Für: Maria, zum Auswerten des Pretests.** Stand 28.09.2026.

Die fachliche Durchsicht nennt vier Dinge, die ein Pilot auswerten soll:
**Ausfülldauer, Missing-Gründe, einseitige Verteilungen, Abbruchstellen.** Dazu
„welches Gespräch tatsächlich daraus entstand" — das ist kein Datenbankwert,
das hörst du im Interview.

Die ersten vier zeichnet die Anwendung jetzt auf. Vorher tat sie es nicht.

---

## Wo die Daten liegen

| Tabelle | Was drinsteht |
|---|---|
| `alignment_answers` | die Antworten selbst, und wer ausgelassen hat mit welchem Grund |
| `alignment_item_views` | wann eine Frage gesehen wurde, wann beantwortet, wie oft geändert |

**Beides ist personenbezogen.** `alignment_item_views` hängt am Fragebogen und
verschwindet mit ihm. Niemand außer der Person selbst darf es in der Anwendung
lesen — auch nicht, wer ihre Antworten sehen darf: Eine Ausfüllzeit ist keine
Antwort.

Du liest es über das Supabase-Dashboard (SQL Editor) oder lokal mit `psql`.
Bewusst nicht über eine Seite in der App: Eine Adminansicht, die fremde
Ausfüllzeiten zeigt, wäre ein eigener Vorgang mit eigener Berechtigung.

Die Abfragen unten sind für **v2.1** geschrieben. Wenn du sie für eine andere
Fassung brauchst, tausche die Kennung.

---

## 1. Ausfülldauer

**Je Frage — wo hängen die Leute?**

```sql
select
  view.block_id,
  count(*)                                                as personen,
  round(avg(extract(epoch from view.answered_at - view.first_seen_at)))  as sekunden_schnitt,
  round(percentile_cont(0.5) within group (
        order by extract(epoch from view.answered_at - view.first_seen_at))) as sekunden_median,
  max(view.revisions)                                     as meiste_aenderungen
from public.alignment_item_views view
join public.assessments a on a.id = view.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
  and view.answered_at is not null
group by view.block_id
order by sekunden_median desc nulls last;
```

Der **Median** ist hier wichtiger als der Schnitt: Eine Person, die zwischendurch
Kaffee holt, verzieht den Schnitt und sagt nichts über die Frage.

**Insgesamt — wie lange dauert der Fragebogen wirklich?**

```sql
select
  a.id,
  count(*) filter (where view.answered_at is not null) as beantwortet,
  round(extract(epoch from
        max(view.answered_at) - min(view.first_seen_at)) / 60)  as minuten_gesamt
from public.alignment_item_views view
join public.assessments a on a.id = view.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
group by a.id
order by minuten_gesamt desc;
```

Die Durchsicht sagt dazu: „auch optionale und bedingte Antworten zählen zum
Aufwand." Deshalb steht hier keine Rechnung nur über die Pflichtfragen.

---

## 2. Missing-Gründe

**Wer lässt was aus — und mit welcher Begründung?**

```sql
select
  answer.block_id,
  answer.missing_code,
  count(*) as anzahl
from public.alignment_answers answer
join public.assessments a on a.id = answer.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
  and answer.missing_code is not null
group by answer.block_id, answer.missing_code
order by anzahl desc;
```

**Worauf zu achten ist:** Eine Frage, bei der viele „kann ich noch nicht
einschätzen" wählen, ist nicht automatisch schlecht — sie kann die Lage der
Leute richtig abbilden. Sie ist aber ein Kandidat für die Nachfrage im
Interview: *Was hat dir gefehlt, um sie zu beantworten?*

Ein Auslassungsgrund ist eine Auskunft, keine Lücke. Er wird nicht
weggerechnet.

---

## 3. Einseitige Verteilungen

**Welche Frage unterscheidet niemanden?**

```sql
select
  answer.block_id,
  answer.value ->> 'optionId'      as option,
  count(*)                          as anzahl,
  round(100.0 * count(*) / sum(count(*)) over (partition by answer.block_id)) as prozent
from public.alignment_answers answer
join public.assessments a on a.id = answer.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
  and answer.value ? 'optionId'
group by answer.block_id, answer.value ->> 'optionId'
order by answer.block_id, anzahl desc;
```

Wenn bei einer Frage 90 % dieselbe Option wählen, trennt sie niemanden. Das war
der Vorwurf des Deckeneffekts an der Vorfassung — und die Durchsicht hat mich
darauf hingewiesen, dass ich ihn damals als Tatsache hingeschrieben hatte, wo
er eine Vermutung war. **Jetzt lässt er sich messen statt behaupten.**

Aber: Bei 8–12 Leuten ist noch gar nichts einseitig. Diese Abfrage wird erst im
zweiten Durchgang (40–80) aussagekräftig.

---

## 4. Abbruchstellen

**Wo hören die Leute auf?**

```sql
select
  view.block_id,
  count(*) as gesehen_nicht_beantwortet
from public.alignment_item_views view
join public.assessments a on a.id = view.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
  and view.answered_at is null
  and a.submitted_at is null
group by view.block_id
order by gesehen_nicht_beantwortet desc;
```

**Und die letzte Frage, die jemand überhaupt gesehen hat:**

```sql
select distinct on (a.id)
  a.id,
  view.block_id  as zuletzt_gesehen,
  view.first_seen_at
from public.alignment_item_views view
join public.assessments a on a.id = view.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
  and a.submitted_at is null
order by a.id, view.first_seen_at desc;
```

---

## 5. Zögern

```sql
select
  view.block_id,
  sum(view.revisions)             as aenderungen_gesamt,
  count(*) filter (where view.revisions > 0) as personen_mit_aenderung
from public.alignment_item_views view
join public.assessments a on a.id = view.assessment_id
where a.instrument_id = 'founder-alignment-v2-1'
group by view.block_id
having sum(view.revisions) > 0
order by aenderungen_gesamt desc;
```

**Das ist kein Gütemaß.** Wer dreimal ändert, denkt vielleicht gründlich nach —
oder hat die Frage nicht verstanden. Welches von beidem, sagt nur das Interview.
Der Wert dieser Zahl liegt darin, dass du weißt, **wonach du fragen sollst.**

---

## Was diese Zahlen nicht können

- **Bei 8–12 Leuten ist nichts davon statistisch.** Die erste Runde ist ein
  Verständnistest, keine Stichprobe. Die Zahlen sagen dir, welche Frage du im
  Gespräch aufgreifst — mehr nicht.
- **Keine Aussage über die Person.** Lange gebraucht heißt nicht unentschlossen.
  Oft geändert heißt nicht unsicher.
- **Keine Aussage über Güte.** Ob eine Frage misst, was sie soll, sagt keine
  Ausfülldauer. Dafür braucht es die kognitiven Interviews und später eine
  Entwicklungsstichprobe.

Die Durchsicht dazu: „Der wissenschaftliche Anspruch liegt vorerst in der
sauberen Fragekonstruktion und begrenzten Interpretation, nicht in einem
Validierungslabel."
