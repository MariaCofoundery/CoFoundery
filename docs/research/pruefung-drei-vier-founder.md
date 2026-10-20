# Prüfung für drei und vier Gründende (Oktober 2026)

Gelesen wurden Datenbankfunktionen (neueste Fassung je Funktion), pgTAP-Tests, Berichtsmodelle und
Oberflächen. Nichts wurde gegen echte Daten oder im Browser geprüft.

## Gebaut

- **Venture Alignment, ZC02 (Stunden):** Ein Kreuzvergleich ohne Lücke landete in „Unterschiede“ (grauer
  Punkt), obwohl die Erwartungen gedeckt sind. Jetzt `classOfResult`: kein Spalt = Einigkeit. Wirkt in der
  Zusammenfassung, in den Gruppen und in der Punktereihe.
- **Venture Alignment, `set_overlap`:** Die Eskalation (zum Beispiel C03 `o1` gegen `o7`) galt auch, wenn
  EINE Person beide Optionen hielt. Jetzt nur bei zwei verschiedenen Personen.
- Tests für beides (auch mit drei und vier Personen).

## Entscheidung nötig (nicht gebaut)

1. **Setup-Bestätigung nach Austritt und Wiedereintritt.** Bestätigungen (`founder_team_setup_confirmations`)
   werden beim Austritt nicht gelöscht, und die Prüfung „alle aktuellen Mitglieder haben bestätigt“ fragt nur,
   ob für jedes aktuelle Mitglied irgendeine Zeile existiert. Tritt C aus und später wieder ein, gilt seine alte
   Bestätigung für Vereinbarungen, die er nie erneut gesehen hat. Betroffen: `get_workstyle_product_team`,
   `get_advisor_confirmed_founder_setup`, die Setup-Seite (`founderSetupModel.ts`) und die Zählung beim Abschluss
   (`confirm_founder_team_setup_revision`). Vorschlag: eine Bestätigung zählt nur, wenn sie nach dem Beginn der
   aktuellen Mitgliedschaft erfolgte (`confirmed_at >= founder_team_members.created_at`). Ändert Einwilligungslogik,
   braucht Migration und Tests an allen vier Stellen.
2. **`get_workstyle_team_share_readiness` nennt Namen, solange nicht alle geteilt haben.** Jedes Mitglied sieht,
   wer noch nicht geteilt hat. Die Tests halten das als gewollt fest. Bei Venture Alignment und Werte &
   Zielkonflikte gilt dagegen „vorher keine Namen“. Entscheiden, ob beides gleich sein soll.
3. **Fähigkeiten-Ansicht (Advisor): `contribute` zählt als Absage** (`capabilityTeamReadout.ts`). Die
   Rollenmatrix im Team behandelt es nie so. Eine Umstellung verschiebt die Zustände (`settled`, `noBasis`), weil
   die Mindestzahl Entschiedener (zwei) an der Absage hängt; vier Tests müssten neu gedacht werden.
4. **Fähigkeiten-Ansicht: Schweigende zählen nicht.** Mit vier Foundern ergibt ein Anspruch und drei Schweigende
   `noBasis`; zwei Absagen und zwei Schweigende ergeben `gap`. Ein Bereich eines Familienverbands gilt als
   „abgedeckt“, wenn eine Sache entschieden ist, auch wenn andere streiten.

## Geprüft und in Ordnung

- Obergrenze vier Mitglieder wird zweimal erzwungen (Trigger und Funktion).
- Venture-Alignment- und Werte-&-Zielkonflikte-Freigabe: Der Vergleich gilt nur, wenn alle aktuellen Mitglieder
  abgegeben und geteilt haben; vorher keine Namen. Beitritt eines dritten oder vierten Mitglieds macht ihn wieder
  „nicht bereit“. Austritt nimmt nur die eigenen Freigaben zurück.
- Der Arbeitsweise-Teambericht verlangt Freigaben aller aktuellen Mitglieder, auch für Advisors.
- Vergleichslogik: Gleichheit, Abstand und Überlappung werten alle Personen aus, niemand ist als erste oder zweite
  festgelegt. ZC01/ZC02 werden je Paar bewertet, nie als Durchschnitt.
- Diagramme: Farben und Buchstaben reichen für vier Personen; die Rollenmatrix steht pro Bereich untereinander und
  ist am Handy lesbar. Alle Mitglieder erscheinen mit Namen und Bild, ohne Kürzung.

## Hinweise

- Neue Team-Funktionen nicht auf `relationships` (Paare) aufbauen, sondern auf `founder_team_members`.
  `participantUserIds` ist auf Paare typisiert; Commitment Lab, Advisor-Zugang und Matching zeigen ein
  Dreierteam nur als die eigenen Paare.
- Die Karte „Commitment Lab“ im Teamvergleich spricht „zu zweit“; bei drei oder vier Personen führt der Link auf die
  Teamseite.
- Ohne Test mit drei oder vier Personen: Darstellung von `BetaCharts`, `BetaTeamReport`, `TradeoffsComparison`,
  Rollenmatrix; `get_workstyle_product_team_status` mit drei Mitgliedern; Setup-Bestätigung nach Austritt und
  Wiedereintritt; fünftes Mitglied.
