# Wenn aus Antworten einmal Forschungsdaten werden sollen

**Anlass:** Maria am 28.09.2026: *„Sowohl Version 1 als auch Version 2 sind
denkbar für die Forschung, und ich wollte das halt irgendwie offen lassen.
Aber es kann auch sein, dass das niemals dafür benutzt wird. … Mir ist
wichtig, dass es möglich ist, irgendwann daraus Forschung zu ziehen, und dann
muss natürlich alles sauber sein."*

**Stand:** Nichts davon ist gebaut, und nichts davon muss gebaut werden, bevor
es gebraucht wird. Dieses Dokument hält fest, wie es zu bauen wäre — damit die
heutigen Entscheidungen es nicht verbauen.

---

## Das Muster gibt es schon, und es ist gut

Für die Nutzungsdaten (`research_events`) ist es bereits umgesetzt, und die
Bauweise ist genau die richtige:

- **`research_events` trägt nur einen `subject_hash`.** Keine Personenkennung,
  kein Fremdschlüssel auf `auth.users`. Die Tabelle allein sagt nicht, wer da
  geantwortet hat.
- **Der Schlüssel liegt woanders:** `research_consent_preferences` hält je
  Person eine `research_subject_id`; der Hash ist deren SHA-256.
- **Der Widerruf löscht über den Hash** — nicht über die Person, die in der
  Forschungstabelle gar nicht steht.
- **Und die Einwilligungstabelle hängt am Konto** (`on delete cascade`). Wird
  das Konto gelöscht, verschwindet der Schlüssel. Was dann noch da ist, lässt
  sich niemandem mehr zuordnen.

Der letzte Punkt ist der wichtigste und war offenbar Absicht: **Kontolöschung
anonymisiert den Forschungsbestand**, statt ihn zu zerstören. Das ist der
Unterschied zwischen „wir haben die Daten gelöscht" und „die Daten sind keine
personenbezogenen Daten mehr" — und nur das Zweite hält, wenn eine Auswertung
schon gelaufen ist.

## Was für v1 und v2 zu tun wäre

**Eine Kopie, kein Zugriff.** Der naheliegende Weg wäre, die Antworten dort zu
lassen und Forschungsabfragen über die Einwilligung zu filtern. Das ist der
falsche Weg: Der Widerruf könnte dann nichts löschen, weil die Daten
gleichzeitig Produktdaten sind — jemand braucht seinen Report ja weiterhin.
„Widerrufen" hieße dann nur „ab jetzt nicht mehr mitrechnen", und das ist
weniger, als der Text verspricht.

Stattdessen: Bei der Einwilligung wird eine **Kopie** in eine eigene Tabelle
geschrieben, unter `subject_hash`, ohne `user_id` und ohne Fremdschlüssel auf
die Person. Genau wie bei `research_events`.

**Drei Dinge müssen dann zusammenpassen:**

1. Die Kopie entsteht nur bei `state = 'accepted'`.
2. `set_my_research_consent` löscht sie beim Widerruf mit — in derselben
   Funktion, nicht in einer zweiten.
3. Der Test `withdrawalCoversResearchData` führt die Tabelle in
   `RESEARCH_TABLES` und nicht mehr in `NOT_RESEARCH_DATA`.

Punkt 3 ist der Grund, warum dieser Test existiert: Er verhindert, dass 1
passiert und 2 vergessen wird.

**Der Zeitpunkt der Kopie ist eine echte Entscheidung.** Wer erst nach dem
Ausfüllen einwilligt, hat seine Antworten schon gegeben — kopiert man sie dann
rückwirkend? Ich würde ja sagen, solange der Text das sagt („deine Antworten",
nicht „deine künftigen Antworten"). Wer widerruft und später wieder einwilligt,
bekommt heute dieselbe `research_subject_id` — das verbindet beide Zeiträume
miteinander. Für eine Längsschnittauswertung ist das erwünscht, für
Sparsamkeit nicht. Das wäre vor der ersten Erhebung zu entscheiden.

## Was heute schon gilt

- **Die v2-Antworten sind keine Forschungsdaten.** Sie entstehen, damit zwei
  Gründer miteinander sprechen können. Ein Test hält das fest, samt Begründung.
- **Die Prüfung, ob die Fragen taugen, ist keine Forschung.** Sie läuft über
  Häufigkeiten ohne Personenbezug (siehe `docs/daten-aus-supabase-ziehen.md`)
  und gehört zum Betrieb. Im Einwilligungstext steht sie deshalb nicht — dort
  gehört nur hin, wozu eingewilligt wird.
- **Die Auskunftspflicht darüber bleibt trotzdem.** Sie gehört in die
  Datenschutzerklärung, nicht in den Dialog, in dem jemand gerade eine
  Entscheidung trifft. Das ist noch offen.

## Was der Widerruf verspricht — und halten kann

> Nach dem Beenden speichern wir keine neuen Forschungsdaten mehr, und die noch
> dir zuordenbaren löschen wir.
>
> Was sich nicht rückgängig machen lässt: Auswertungen, in denen deine Angaben
> bereits mit denen anderer zusammengefasst wurden. Aus einer Häufigkeit über
> hundert Menschen lässt sich dein Anteil nicht wieder herausrechnen, und was
> veröffentlicht wurde, bleibt veröffentlicht.

Das ist so weit, wie es realistisch geht, und es steht dort, wo jemand es liest
— nicht in einer Fußnote. Der zweite Absatz ist kein Kleingedrucktes, sondern
der ehrliche Teil: Ohne ihn verspräche der erste zu viel.
