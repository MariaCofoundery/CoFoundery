import type { AlignmentPerson } from "@/features/advisor/AlignmentSideBySide";
import type { TeamCapabilityReadout } from "@/features/capability/capabilityTeamData";
import { buildCapabilityTeamReadout, type TeamMemberSides } from "@/features/capability/capabilityTeamReadout";
import type { AreaSourcing, CapabilityArea, CapabilityFamily } from "@/features/capability/capabilityTypes";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";

/**
 * Beispieldaten fuer die Vorschau der Gruppenauswertung unter /advisor/beispiel?tab=group.
 *
 * Drei erfundene Personen, so wie die echte Seite sie zeigen wuerde: die Rollenlage wird mit derselben reinen
 * Funktion gerechnet (`buildCapabilityTeamReadout`) und mit demselben Bauteil gezeichnet, die Selbstbilder mit
 * demselben Bauteil wie unter /advisor/review/<id>. Nichts davon liegt in der Datenbank. Die Werte sind so
 * gewaehlt, dass mehrere Zustaende vorkommen (doppelter Anspruch, Luecke, offene Stelle, Einigkeit) - das ist
 * eine Anschauung, keine Aussage ueber echte Menschen.
 */
const FAMILIES: CapabilityFamily[] = [
  ["customer_market", 1],
  ["product_value", 2],
  ["strategy_business_model", 3],
  ["technology_delivery", 4],
  ["commercial_growth", 5],
  ["finance_funding", 6],
].map(([family_id, sort_order]) => ({ family_id: family_id as string, sort_order: sort_order as number }));

const AREAS: [string, string, AreaSourcing][] = [
  ["customer_discovery", "customer_market", "internal_only"],
  ["market_analysis", "customer_market", "component"],
  ["business_model", "strategy_business_model", "internal_only"],
  ["software_engineering", "technology_delivery", "depends"],
  ["technical_architecture", "technology_delivery", "depends"],
  ["marketing_brand", "commercial_growth", "component"],
  ["b2b_sales", "commercial_growth", "depends"],
  ["accounting_controlling", "finance_funding", "component"],
  ["fundraising", "finance_funding", "depends"],
];

const AREA_ROWS: CapabilityArea[] = AREAS.map(([area_id, family_id, sourcing], index) => ({ area_id, family_id, sourcing, sort_order: index + 1 }));

type Entry = [string, number | null, string | null];

const entries = (rows: Entry[]) => rows.map(([areaId, applicationLevel, ownershipWish]) => ({ areaId, applicationLevel, ownershipWish }));

export function buildExampleGroup(names: string[]) {
  const [anna, ben, carla, dev] = [names[0] ?? "A", names[1] ?? "B", names[2] ?? "C", names[3] ?? "D"];
  const members: TeamMemberSides[] = [
    {
      userId: "ex-anna",
      name: anna,
      entries: entries([
        ["customer_discovery", 4, "own"],
        ["business_model", 4, "own"],
        ["b2b_sales", 3, "own"],
        ["software_engineering", 1, "prefer_other"],
        ["fundraising", 2, "prefer_other"],
        ["accounting_controlling", 1, "prefer_external"],
      ]),
    },
    {
      userId: "ex-ben",
      name: ben,
      entries: entries([
        ["software_engineering", 5, "own"],
        ["technical_architecture", 4, "own"],
        ["customer_discovery", 2, "contribute"],
        ["fundraising", 1, "prefer_external"],
        ["accounting_controlling", 4, "prefer_external"],
        ["marketing_brand", 2, "prefer_other"],
      ]),
    },
    {
      userId: "ex-carla",
      name: carla,
      entries: entries([
        ["customer_discovery", 3, "own"],
        ["marketing_brand", 2, "own"],
        ["technical_architecture", 1, "prefer_other"],
        ["b2b_sales", 4, "contribute"],
        ["accounting_controlling", 2, "prefer_other"],
      ]),
    },
  ];
  const readout = buildCapabilityTeamReadout(members, AREA_ROWS, FAMILIES);
  const group: TeamCapabilityReadout = { readout, contributing: members.length, withDepth: members.length, memberCount: members.length };

  // Die Selbstbilder: je Achse eine Stelle zwischen 1 und 5. Carla hat zwei Achsen ohne Angabe, damit man sieht, wie das aussieht.
  const pattern = [
    [4.2, 2.1, 3.4],
    [2.5, 4.4, 3.1],
    [3.8, 3.0, 1.9],
    [1.8, 3.6, 4.5],
    [4.6, 2.4, 3.3],
    [3.1, 4.1, 2.2],
    [2.0, 3.7, 4.0],
    [4.0, 2.6, 3.5],
  ];
  const score = (person: number, index: number) => pattern[index % pattern.length][person];
  const alignment: AlignmentPerson[] = [
    { userId: "ex-anna", name: anna, scores: Object.fromEntries(FOUNDER_DIMENSION_ORDER.map((key, index) => [key, score(0, index)])) },
    { userId: "ex-ben", name: ben, scores: Object.fromEntries(FOUNDER_DIMENSION_ORDER.map((key, index) => [key, score(1, index)])) },
    {
      userId: "ex-carla",
      name: carla,
      scores: Object.fromEntries(FOUNDER_DIMENSION_ORDER.map((key, index) => [key, index === 2 || index === 5 ? null : score(2, index)])),
    },
  ];

  return { group, alignment, included: [anna, ben, carla], withoutAlignment: [dev] };
}
