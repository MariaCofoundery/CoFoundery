import { DOOR_CLOSENESS, DOOR_GROUPS, DOOR_SECTORS } from "@/features/connect/doors/doorCatalog";
import type { DoorFormCopy } from "@/features/connect/doors/DoorForm";

type T = (key: string, values?: Record<string, string | number>) => string;

/** Alle Beschriftungen des Formulars aus der Namensraum "connect.doors" - fuer die Seite und die Suche dieselben. */
export function doorFormCopy(t: T): DoorFormCopy {
  return {
    step1: t("step1"), step1b: t("step1b"), step2: t("step2"), regionPlaceholder: t("regionPlaceholder"), sector: t("sector"), sectorNone: t("sectorNone"), step3: t("step3"),
    note: t("note"), noteHint: t("noteHint"), otherLabel: t("otherLabel"), pickType: t("pickType"), save: t("save"), cancel: t("cancel"), otherTypeLabel: t("types.other"),
    closeness: DOOR_CLOSENESS.map((key) => ({ key, label: t(`closeness.${key}.label`), text: t(`closeness.${key}.text`) })),
    groups: DOOR_GROUPS.map((group) => ({ key: group.key, label: t(`groups.${group.key}`), types: group.types.map((type) => ({ key: type, label: t(`types.${type}`) })) })),
    sectors: DOOR_SECTORS.map((key) => ({ key, label: t(`sectors.${key}`) })),
  };
}

export const doorTitle = (t: T, door: { typeKey: string; otherLabel: string | null }) => (door.typeKey === "other" ? door.otherLabel ?? t("types.other") : t(`types.${door.typeKey}`));
export const doorMeta = (t: T, door: { sectorKey: string | null; region: string | null }) => [door.region, door.sectorKey ? t(`sectors.${door.sectorKey}`) : null].filter(Boolean).join(" · ");
