# Supabase Guide

## Regel
Alle Datenmodell-Änderungen muessen mit den Supabase-Migrationen in `supabase/migrations/` konsistent sein.

## Vorgehen
- Vor jeder Datenmodell-Aenderung: relevante Migrationen pruefen.
- Neue Tabellen/Spalten nur ueber neue Migrationen anlegen.
- Edge Functions muessen das aktuelle Schema reflektieren.
