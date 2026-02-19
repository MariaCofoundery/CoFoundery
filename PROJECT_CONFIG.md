# PROJECT_CONFIG

## Projekt
- Name: CoFoundery Align
- Beschreibung: Digitaler Reflexions- und Vergleichsreport fuer potenzielle Mitgruender:innen, der Arbeits-, Entscheidungs- und Wertemuster sichtbar macht und strukturierte Gespraeche vor der Co-Founderschaft ermoeglicht.
- Typ: Web-App

## Tech-Stack
- Framework: Next.js
- Sprache: TypeScript
- Styling: Tailwind CSS
- UI Library: shadcn/ui
- Datenbank: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Hosting: Vercel
- Package Manager: pnpm

## Konventionen
- Branch-Strategie: feature-branch
- Commit-Format: conventional commits
- Feature-Prefix: CF
- Test-Framework: Vitest + Playwright

## Verzeichnisstruktur
- Features: /features/
- Components: /src/components/
- API Routes: /src/app/api/
- Tests: /tests/

## Agents-Verzeichnis
- Pfad: /

## UI-Library Details (optional — hilft dem Frontend Developer)
- Library: shadcn/ui
- Install-Befehl: npx shadcn@latest add <component-name> --yes
- Import-Pattern: import { Button } from "@/components/ui/button"
- Installierte Components: -
- Verfuegbare Components (noch nicht installiert): accordion, collapsible, popover, dialog, table, tabs, badge
- Docs: https://ui.shadcn.com/docs/components
