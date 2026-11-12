/**
 * Die Suche vorbefuellen: Ein freies Feld der Teamkarte (Align) fuehrt mit `?familie=` hierher.
 *
 * DAS IST EINE HANDLUNG DER PERSON, KEIN DATENFLUSS. Die Familie steht in der Adresse, die Person sieht
 * die Auswahl im Formular und speichert sie selbst - oder nicht. Find bekommt nichts aus Align.
 *
 * Bereits gespeicherte Suchkriterien bleiben stehen; die Bereiche der Familie kommen dazu, bis die Grenze
 * erreicht ist. Eine unbekannte Familie aendert nichts.
 */
export function prefillCapabilityAreas(
  saved: readonly string[],
  familyId: string | null | undefined,
  areas: readonly { area_id: string; family_id: string; sort_order: number }[],
  max: number,
): string[] {
  const result = [...saved];
  if (!familyId) return result;
  const inFamily = areas
    .filter((area) => area.family_id === familyId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((area) => area.area_id);
  for (const areaId of inFamily) {
    if (result.length >= max) break;
    if (!result.includes(areaId)) result.push(areaId);
  }
  return result;
}
