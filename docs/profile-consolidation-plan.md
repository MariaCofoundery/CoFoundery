# Profil-Zusammenzug: Plan für „alles an einem Ort"

## Status
- Stand: 2026-09-07
- Ziel: `/profile` ist der eine Ort für alles Profilbezogene; der Dashboard-Block „Profildaten bearbeiten" führt dorthin statt ein eigenes Formular einzubetten
- Nicht Ziel: Veröffentlichungsentscheidungen einsammeln — die bleiben bewusst in ihrem Kontext
- Grundlage: `web/docs/capability-model-technical-brief.md`

---

## 1. Der Ist-Zustand, vollständig

Profilbezogene Daten liegen heute an acht Stellen. Die Spalte „gehört nach" ist der Vorschlag dieses Plans.

| Nr. | Daten | Tabelle | Heute bearbeitbar unter | Gehört nach |
|---|---|---|---|---|
| 1 | Name, Headline, Über mich, Region, Zusammenarbeitsmodus, Expertise, Branchen | `person_core` | `/profile` | bleibt |
| 2 | Capability-Bereiche, Anwendungsstufe, Ownership, Belege | `person_capability_*` | `/profile` | bleibt |
| 3 | `focus_skill`, `intention`, `roles`, `avatar_id`, `avatar_url` | `profiles` | Dashboard-Block, `/welcome`, `/join/welcome` | siehe 4.2 bis 4.4 |
| 4 | Connect-Rollen, Foto, Sichtbarkeit, Status | `network_profiles` | `/connect/profile` | bleibt (Kontext) |
| 5 | Identität (noch doppelt) + Suchabsicht, Start-Horizont, gesuchte Rollen, Verfügbarkeit, Commitment, Venture-Phase und -Ziel, Alignment-Präferenzen | `founder_discovery_profiles` | `/discovery/profile` | Identität nach 1, Rest bleibt (Kontext) |
| 6 | Must-haves, Prioritätsgewichte, Assessment-Einwilligung | `founder_search_preferences` | `/discovery` | bleibt (Kontext) |
| 7 | Research-Einwilligung | `research_consent_preferences` | Dashboard | `/account` |
| 8 | Kontolöschung | — | `/account` | bleibt |

Zwei Foto-Verträge existieren parallel und sind **nicht** zusammengelegt: `profiles.avatar_*` liegt im öffentlichen Bucket `avatars`, `network_profiles.photo_*` im privaten `network-profile-images` mit eigenem Sichtbarkeitsvertrag. Das ist Absicht und der Grund, warum Foto eine eigene Phase bekommt.

---

## 2. Die Leitunterscheidung

Nicht alles Profilbezogene gehört an einen Ort. Drei Kategorien:

**Identität und Inventar** — wer ich bin und was ich mitbringe. Gilt überall gleich. Gehört nach `/profile`.

**Veröffentlichungsentscheidungen** — was davon in welchem Kontext gezeigt wird, mit welcher Sichtbarkeit, in welchem Status. Gehört in den Kontext, in dem veröffentlicht wird. Sie an einem Ort zu bündeln wäre bequem und falsch: Die Trennung ist genau das, was die Public-Visibility-Spec strukturell durchsetzt, und ein zentraler Sichtbarkeitsschalter wäre der schnellste Weg, sie zu verlieren.

**Konto und Einwilligungen** — Löschung, Research-Einwilligung, Sprache. Gehört nach `/account`.

Der Satz für die Oberfläche: **Inhalte pflegst du auf `/profile`, veröffentlichen entscheidest du dort, wo veröffentlicht wird.**

---

## 3. Was schon steht

- `person_core` als kanonische Zeile, eine pro registriertem Menschen, per Trigger auf `auth.users`
- Synchronisation in beide Richtungen: Kontextzeile → Kern und Kern → Kontextzeilen, mit Schleifenschutz, ohne dass leere Werte etwas löschen und ohne dass Veröffentlichung berührt wird
- `/profile` mit Identitäts-Editor, Capability-Snapshot in drei Schritten und Ergebnisansicht
- Connect pflegt keine Identität mehr

---

## 4. Die offenen Phasen

### 4.1 Discovery-Identität ablösen

Dieselbe Umstellung wie bei Connect: Identitätsfelder von `/discovery/profile` entfernen, Zusammenfassung mit Link auf `/profile` einsetzen, Parser die Identität übergeben statt sie aus dem Formular zu lesen.

Aufwand gering, Muster liegt vor. Zu beachten: `founder_discovery_profiles` hat einen eigenen Vollständigkeitscheck für `status = 'active'` — derselbe Grenzfall wie bei Connect, also dieselbe eigene Fehlermeldung.

Danach ist die Doppelpflege vollständig beendet.

### 4.2 Der Dashboard-Block wird ein Eingang

`#dashboard-block-profile-data` bettet heute `ProfileBasicsForm` ein. Künftig zeigt der Block eine Zusammenfassung aus `person_core` und führt auf `/profile`.

Die Onboarding-Variante des Formulars bleibt, wo sie ist: `/welcome` und `/join/welcome` brauchen weiter einen kurzen Einstieg, und der ist etwas anderes als ein Profil-Editor.

### 4.3 `focus_skill` ablösen

`focus_skill` ist eine Einfachauswahl aus acht Werten und wird durch die Capability-Bereiche fachlich ersetzt. Die Ablösung ist keine reine Löschung:

- Die Spalte trägt Gewicht 20 in `profileCompletion`. Sie zu entfernen **erhöht** die sichtbaren Vollständigkeitswerte aller Bestandsnutzer. Das ist eine Produktentscheidung, keine technische.
- Migration: Wert nach der Mapping-Tabelle in Kapitel 4.5 des Capability-Briefs in einen `person_capability_entries`-Eintrag übersetzen — Familie übernehmen, Bereich vorschlagen.
- Nebenbei zu klären: Ob `profileCompletion` überhaupt bleibt. Ein Vollständigkeits-Prozentwert ist ein Score, und das Produkt verweigert Scores an jeder anderen Stelle.

### 4.4 `intention` und `roles` verorten

`intention` (Suche / Partner-Match / Selbsttest) ist keine Identität, sondern eine Absicht zu einem Zeitpunkt. Kandidaten: nach Discovery als Kontextangabe, oder als reiner Onboarding-Zustand belassen und nicht mehr editierbar zeigen.

`roles` (founder / advisor) ist Produktzustand und steuert Zugriff. Es gehört **nicht** in den Kern — dort würde es genau den Fehler wiederholen, den `profiles.roles default '{founder}'` verursacht hat. Vorschlag: sichtbar auf `/profile` als „Was nutzt du?", geschrieben aber weiter nach `profiles`.

### 4.5 Foto zusammenlegen

Die aufwendigste Phase und deshalb die letzte. Zwei Buckets, zwei Sichtbarkeitsverträge, und der Connect-Vertrag wurde gerade gehärtet — inklusive einer server-only Auflösungsfunktion und der Regel, dass ein Foto nur bei veröffentlichter Entity und `public_allowed` ausgeliefert wird.

Vor jeder Umsetzung zu entscheiden: Gilt künftig **ein** Foto mit einem Sichtbarkeitsvertrag, oder bleiben Founder-Avatar und Connect-Foto getrennt? Ein einziges Foto ist die bessere Erfahrung, bedeutet aber, den öffentlichen `avatars`-Bucket aufzugeben oder den privaten zu öffnen. Letzteres wäre ein Rückschritt.

### 4.6 Research-Einwilligung nach `/account`

Sie liegt heute im Dashboard, gehört aber zu Konto und Einwilligungen. Kleiner Umzug, sinnvoll gemeinsam mit 4.2.

---

## 5. Reihenfolge und Begründung

1. **4.1 Discovery-Identität** — beendet die Doppelpflege, Muster liegt vor, kein offener Entscheid
2. **4.2 Dashboard-Block** plus **4.6 Research-Einwilligung** — macht `/profile` sichtbar auffindbar; ohne diesen Schritt kennt niemand die neue Seite
3. **4.4 `intention` und `roles`** — klein, aber braucht deine Entscheidung
4. **4.3 `focus_skill`** — braucht die Entscheidung über `profileCompletion`
5. **4.5 Foto** — braucht die Entscheidung über die Bucket-Frage

Schritt 2 ist der, der den Nutzen freischaltet. Alles davor ist Aufräumen hinter den Kulissen.

---

## 6. Was dieser Plan nicht vorschlägt

- **Keinen zentralen Sichtbarkeitsschalter.** Siehe Kapitel 2.
- **Keine Zusammenlegung der Kontexttabellen.** Discovery und Connect stellen verschiedene Fragen; ihre kontextspezifischen Felder haben keine Entsprechung beim anderen.
- **Keinen Vollständigkeitsbalken auf `/profile`.** Fortschrittsanzeigen sind Scores. Wenn Motivation gebraucht wird, dann über die Rückmeldung pro Schritt, die der Snapshot schon gibt.
- **Kein Entfernen der Onboarding-Formulare.** Ein Einstieg ist etwas anderes als ein Editor.

---

## 7. Offene Entscheidungen

1. Bleibt `profileCompletion` mit Gewichten, oder fällt der Vollständigkeitswert? (blockiert 4.3)
2. Ein Foto mit einem Sichtbarkeitsvertrag, oder zwei getrennte? (blockiert 4.5)
3. Wohin mit `intention`? (blockiert 4.4)
4. Soll `roles` auf `/profile` sichtbar und änderbar sein, oder nur sichtbar?
