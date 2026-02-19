# Quick-Start Guide: Agent-basierte Softwareentwicklung

## Was ist das?

Ein Set aus 10 spezialisierten AI-Agents, die zusammen einen vollständigen Software-Entwicklungsprozess abbilden — von der Idee bis zum Deployment. Jeder Agent hat eine klare Rolle und übergibt strukturiert an den nächsten.

---

## Die Agents im Überblick

| Nr. | Agent | Aufgabe | Typ |
|-----|-------|---------|-----|
| 0 | **Orchestrator** | Steuert den Workflow, koordiniert Übergaben | Pipeline-Steuerung |
| 1 | **Requirements Engineer** | Schreibt Feature Specs mit User Stories & ACs | Pipeline |
| 2 | **Solution Architect** | Plant Architektur & Tech-Design | Pipeline |
| 3 | **UX/Design Agent** | Erstellt Design-System, Wireframes, Farbpaletten | Pipeline (optional) |
| 4 | **Frontend Developer** | Baut die UI | Pipeline |
| 5 | **Backend Developer** | Baut APIs, DB, Server-Logik | Pipeline |
| 6 | **QA Engineer** | Testet & findet Bugs | Pipeline |
| 7 | **DevOps Engineer** | Deployed & überwacht | Pipeline |
| 8 | **Research Agent** | Recherchiert Libraries, Security, Patterns | On-Demand |
| 9 | **Documentation Agent** | Schreibt README, API-Docs, Guides | On-Demand |

---

## Schnellstart: Neues Projekt

### Schritt 1: Orchestrator starten

```
Lies [agents-pfad]/0-orchestrator.md und starte ein neues Projekt
```

Der Orchestrator fragt dich nach Projektname, Tech-Stack, etc. und erstellt:
- `PROJECT_CONFIG.md` — Zentrale Konfiguration
- `FEATURE_TRACKER.md` — Feature-Übersicht
- `/features/` — Verzeichnis für Feature Specs
- `/research/` — Verzeichnis für Recherche-Ergebnisse

### Schritt 2: Erstes Feature anfragen

```
Lies [agents-pfad]/0-orchestrator.md — neues Feature: [Beschreibung]
```

Der Orchestrator leitet dich durch die Pipeline:

```
Requirements → Architecture → UX/Design → Frontend → Backend → QA → DevOps
     1              2          3 (opt.)       4         5        6       7
```

Am Ende jeder Phase sagt dir der Agent den nächsten Befehl.

---

## Die Standard-Pipeline (Schritt für Schritt)

### 1️⃣ Requirements Engineer
```
Lies [agents-pfad]/1-requirements-engineer.md und erstelle eine Feature Spec für: [Beschreibung]
```
**Was passiert:** Stellt dir Fragen → schreibt Feature Spec → du gibst Approval
**Ergebnis:** `/features/PROJ-X-feature-name.md`

### 2️⃣ Solution Architect
```
Lies [agents-pfad]/2-solution-architect.md und erstelle ein Tech-Design für /features/PROJ-X-feature-name.md
```
**Was passiert:** Liest Spec → erstellt Architektur → du gibst Approval
**Ergebnis:** Tech-Design Section in der Feature Spec

### 3️⃣ UX/Design Agent (optional pro Feature)
```
Lies [agents-pfad]/3-ux-design-agent.md und erstelle ein Design für /features/PROJ-X-feature-name.md
```
**Was passiert:** Erstellt Farbpalette, Typografie, Wireframes → du gibst Approval
**Ergebnis:** Design-System + Wireframes in `/design/`
**Überspringen wenn:** Design-System existiert bereits und Feature nutzt bestehende Screens

### 4️⃣ Frontend Developer
```
Lies [agents-pfad]/4-frontend-developer.md und implementiere /features/PROJ-X-feature-name.md
```
**Was passiert:** Baut UI-Components → du testest im Browser → Approval
**Ergebnis:** Fertige UI

### 5️⃣ Backend Developer (nur wenn nötig)
```
Lies [agents-pfad]/5-backend-developer.md und implementiere /features/PROJ-X-feature-name.md
```
**Was passiert:** Baut APIs + DB → du testest Endpunkte → Approval
**Ergebnis:** Fertige APIs + Datenbank

### 6️⃣ QA Engineer
```
Lies [agents-pfad]/6-qa-engineer.md und teste /features/PROJ-X-feature-name.md
```
**Was passiert:** Testet alles → findet Bugs → du priorisierst
**Ergebnis:** Test-Report in der Feature Spec

### 7️⃣ DevOps Engineer
```
Lies [agents-pfad]/7-devops-engineer.md und deploye /features/PROJ-X-feature-name.md
```
**Was passiert:** Deployed → prüft Production → du testest live
**Ergebnis:** Feature ist live 🚀

---

## On-Demand Agents (jederzeit aufrufen)

### 🔍 Research Agent
```
Lies [agents-pfad]/8-research-agent.md und recherchiere: [Fragestellung]
```
**Wann:** Vor Tech-Entscheidungen, bei Security-Fragen, für Library-Vergleiche
**Beispiele:**
- "Welche Auth-Library passt am besten für unser Projekt?"
- "Was sind die DSGVO-Anforderungen für User-Daten?"
- "npm audit zeigt Vulnerabilities — wie kritisch ist das?"

### 🎨 UX/Design Agent (auch on-demand nutzbar)
```
Lies [agents-pfad]/3-ux-design-agent.md und erstelle ein Design für /features/PROJ-X-feature-name.md
```
**Wann:** Jederzeit für Design-Updates, Redesigns, neue Screens
**Beispiele:****
- "Erstelle ein Design-System für das Projekt"
- "Wie sollte der Login-Screen aussehen?"
- "Erstelle eine Farbpalette und Typografie"

### 📝 Documentation Agent
```
Lies [agents-pfad]/9-documentation-agent.md und dokumentiere [Scope]
```
**Wann:** Nach Implementierung, vor/nach Deployment
**Beispiele:**
- "Schreibe eine README für das Projekt"
- "Generiere API-Dokumentation"
- "Erstelle einen Onboarding-Guide für neue Entwickler"

---

## Nützliche Orchestrator-Befehle

| Was du willst | Befehl |
|--------------|--------|
| Neues Projekt starten | `Lies [agents-pfad]/0-orchestrator.md und starte ein neues Projekt` |
| Neues Feature anfragen | `Lies [agents-pfad]/0-orchestrator.md — neues Feature: [Beschreibung]` |
| Projektstatus sehen | `Lies [agents-pfad]/0-orchestrator.md — zeige den aktuellen Projektstatus` |
| Nächsten Schritt erfahren | `Lies [agents-pfad]/0-orchestrator.md — was ist der nächste Schritt für PROJ-X?` |
| Bugfix-Loop starten | `Lies [agents-pfad]/0-orchestrator.md — QA hat Bugs in PROJ-X, starte Bugfix-Loop` |

---

## Projektstruktur

Nach dem Setup sieht dein Projekt so aus:

```
mein-projekt/
├── PROJECT_CONFIG.md          ← Zentrale Konfiguration (Tech-Stack, Konventionen)
├── FEATURE_TRACKER.md         ← Status aller Features
├── features/
│   ├── PROJ-1-user-auth.md    ← Feature Spec + Tech-Design + QA-Report
│   ├── PROJ-2-create-post.md
│   └── ...
├── research/
│   ├── PROJ-1-auth-library-comparison.md
│   └── ...
├── docs/                      ← Vom Documentation Agent generiert
│   ├── README.md
│   ├── API.md
│   └── ...
├── .claude/agents/            ← Agent-Prompts (oder anderer Pfad)
│   ├── 0-orchestrator.md
│   ├── 1-requirements-engineer.md
│   ├── ...
│   └── 9-documentation-agent.md
└── src/                       ← Dein Code
    ├── components/
    ├── app/
    └── ...
```

---

## Tipps für den Alltag

1. **Immer beim Orchestrator starten** wenn du unsicher bist — er weiß was der nächste Schritt ist
2. **Features klein halten** — lieber 5 kleine Features als 1 großes (Single Responsibility)
3. **Research Agent nutzen** bevor du eine Tech-Entscheidung triffst — spart später Umbau-Aufwand
4. **Jeden Agent sein Ding machen lassen** — der Requirements Engineer schreibt keinen Code, der Frontend Dev macht keine DB-Queries
5. **QA nicht überspringen** — die meisten Production-Bugs entstehen weil QA übersprungen wurde

---

## FAQ

**Muss ich immer alle Agents durchlaufen?**
Nein. Ein reines Frontend-Feature braucht keinen Backend Developer. Ein Bug-Fix geht direkt zum Dev + QA. Der Orchestrator hilft dir zu entscheiden was nötig ist.

**Kann ich Agents in beliebiger Reihenfolge aufrufen?**
Die Pipeline-Agents bauen aufeinander auf (Requirements → Architect → Dev → QA → DevOps). Die On-Demand-Agents (Research, UX, Docs) kannst du jederzeit aufrufen.

**Funktioniert das nur mit Claude Code?**
Nein. Die Agents funktionieren in Claude Code (Terminal), Claude.ai (Chat), und als generische Prompts. In Claude.ai kopierst du den Agent-Prompt als Kontext in den Chat.

**Was wenn ein Agent Fehler macht?**
Jeder Agent hat eine Checklist am Ende. Geh die Punkte durch. Wenn was fehlt, sag dem Agent was er nachbessern soll. Du hast bei jedem Schritt ein Review/Approval-Gate.
