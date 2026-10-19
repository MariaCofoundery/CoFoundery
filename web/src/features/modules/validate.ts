import {
  COMPARE_METHODS,
  COMPARE_STANCES,
  INPUT_METHODS,
  MODULE_CADENCES,
  MODULE_SCOPES,
  MODULE_TIERS,
  MODULE_USAGES,
  SENSITIVITIES,
  SETUP_HANDOFF_WHEN,
  SHARING_BINDINGS,
  SHARING_CEILINGS,
  STORAGE_KINDS,
  type ModuleDefinition,
} from "@/features/modules/types";

/**
 * Contract-Validatoren fuer die Modul-Registry.
 *
 * Sie pruefen den Vertrag (`docs/architecture/module-architecture-v1.md`,
 * Abschnitt 4), nicht den Inhalt: ob die Kombination aus Scope, Speicherform,
 * Freigabebindung und Renderern in sich stimmt. Rein - ohne Datenbank, ohne
 * Dateizugriff. Was von aussen kommt (Setup-Katalog, Sprachtexte), wird als
 * `env` hereingereicht.
 *
 * ES WIRD GESAMMELT, NICHT BEIM ERSTEN FEHLER ABGEBROCHEN: Wer ein Modul
 * registriert, soll alle Verstoesse auf einmal sehen.
 */

export type ModuleContractIssue = {
  moduleId: string;
  rule: string;
  message: string;
};

export type ModuleContractEnv = {
  /** Die Schluessel des Founder-Setup-Katalogs. */
  setupItemKeys?: readonly string[];
  /** Ob ein Sprachtext im Namensraum vorhanden ist. */
  hasMessage?: (locale: "de" | "en", namespace: string, key: string) => boolean;
};

const MODULE_ID = /^[a-z][a-z0-9_]{1,40}$/;

const oneOf = (list: readonly string[], value: unknown): boolean =>
  typeof value === "string" && list.includes(value);

const blank = (value: unknown) => typeof value !== "string" || value.trim() === "";

/** Die Schluessel, unter denen ein Modul seine Texte erwartet. */
export function moduleMessageKeys(moduleId: string) {
  return [`${moduleId}.title`, `${moduleId}.summary`] as const;
}

export function validateModuleDefinition(
  def: ModuleDefinition,
  env: ModuleContractEnv = {}
): ModuleContractIssue[] {
  const issues: ModuleContractIssue[] = [];
  const id = typeof def?.moduleId === "string" ? def.moduleId : "(ohne moduleId)";
  const add = (rule: string, message: string) => issues.push({ moduleId: id, rule, message });

  // --- Identitaet ----------------------------------------------------------
  if (!MODULE_ID.test(id)) add("module_id", "moduleId muss klein geschrieben sein (a-z, 0-9, _).");

  // --- Enums ---------------------------------------------------------------
  if (!oneOf(MODULE_SCOPES, def.scope)) add("scope", `Ungueltiger Scope: ${String(def.scope)}`);
  if (!oneOf(MODULE_TIERS, def.tier)) add("tier", `Ungueltiger Tier: ${String(def.tier)}`);
  if (!oneOf(MODULE_CADENCES, def.cadence)) add("cadence", `Ungueltige Cadence: ${String(def.cadence)}`);
  if (!oneOf(MODULE_USAGES, def.usage)) add("usage", `Ungueltige Usage: ${String(def.usage)}`);

  // --- Input: Methode und Speicherform sind getrennte Pflichtfelder --------
  const input = def.input as Partial<ModuleDefinition["input"]> | undefined;
  if (!input || typeof input !== "object") {
    add("input", "input fehlt.");
  } else {
    if (!oneOf(INPUT_METHODS, input.method)) add("input_method", `Ungueltige Input-Methode: ${String(input.method)}`);
    if (!oneOf(STORAGE_KINDS, input.storage)) add("input_storage", `Ungueltige Speicherform: ${String(input.storage)}`);
    if (blank(input.writesTo)) add("input_writes_to", "input.writesTo fehlt.");
    for (const method of input.additionalMethods ?? []) {
      if (!oneOf(INPUT_METHODS, method)) add("input_method", `Ungueltige weitere Input-Methode: ${String(method)}`);
      if (method === input.method) add("input_method", "additionalMethods wiederholt die Hauptmethode.");
    }
  }
  const storage = input?.storage;

  // --- Versionen -----------------------------------------------------------
  if (!Array.isArray(def.versions) || def.versions.length === 0) {
    add("versions", "Ein Modul braucht mindestens eine Version.");
  } else {
    const seen = new Set<string>();
    for (const version of def.versions) {
      if (blank(version.versionId)) add("version_id", "versionId ist Pflicht.");
      else if (seen.has(version.versionId)) add("version_id", `versionId doppelt: ${version.versionId}`);
      else seen.add(version.versionId);

      if (blank(version.compatGroup)) add("compat_group", `compatGroup fehlt bei ${String(version.versionId)}.`);
      if (version.compat !== undefined && version.compat !== "intersect") {
        add("compat", `Ungueltiges compat bei ${version.versionId}: ${String(version.compat)}`);
      }
      // Nicht aus der Methode abgeleitet: nur die Speicherform verlangt ein Instrument.
      if (storage === "assessments" && blank(version.instrumentId)) {
        add("instrument_id", `storage = assessments verlangt eine instrumentId (${String(version.versionId)}).`);
      }
    }
  }

  // --- Abschluss -----------------------------------------------------------
  if (blank(def.completion?.source)) add("completion", "completion.source fehlt.");

  // --- Freigabe ------------------------------------------------------------
  const sharing = def.sharing;
  if (!oneOf(SHARING_CEILINGS, sharing?.ceiling)) add("sharing_ceiling", `Ungueltige Obergrenze: ${String(sharing?.ceiling)}`);
  if (!oneOf(SENSITIVITIES, sharing?.sensitivity)) add("sharing_sensitivity", `Ungueltige Sensitivitaet: ${String(sharing?.sensitivity)}`);
  if (!oneOf(SHARING_BINDINGS, sharing?.bindsTo)) add("sharing_binds_to", `Ungueltige Bindung: ${String(sharing?.bindsTo)}`);

  // `storage` ist der Antwortspeicher, `bindsTo` der Freigabevertrag. Ein
  // NATIVES Modul in `assessments` teilt an den Durchlauf; ein bestehender
  // Adapter (`legacyAdapter`) behaelt seinen eigenen Vertrag.
  if (storage === "assessments" && !def.legacyAdapter && sharing?.bindsTo !== "assessment") {
    add("binds_to", "storage = assessments verlangt bindsTo = assessment (ausser bei einem bestehenden Adapter mit legacyAdapter).");
  }
  if (def.legacyAdapter !== undefined && def.legacyAdapter !== true) {
    add("legacy_adapter", "legacyAdapter ist nur als `true` gueltig.");
  }
  if (def.legacyAdapter === true && sharing?.bindsTo !== "existing_contract") {
    add("legacy_adapter_binds_to", "Ein bestehender Adapter (legacyAdapter) teilt nach seinem eigenen Vertrag: bindsTo = existing_contract.");
  }
  if (storage === "rounds" && sharing?.bindsTo !== "round") {
    add("binds_to", "storage = rounds verlangt bindsTo = round.");
  }
  if (storage === "existing" && sharing?.bindsTo !== "existing_contract") {
    add("binds_to", "storage = existing verlangt bindsTo = existing_contract.");
  }
  if (sharing?.sensitivity === "sensitive" && sharing.ceiling === "answers") {
    add("sensitive_ceiling", "Ein sensibles Modul darf hoechstens bestaetigte Aussagen teilen (statements).");
  }

  // --- Vertiefungen haengen an einem Core-Bereich --------------------------
  if (def.tier === "deepening" && def.scope !== "team" && (def.deepens === undefined || blank(def.deepens))) {
    add("deepens_required", "Eine Vertiefung haengt an einem Core-Modul (deepens).");
  }
  if (def.deepens !== undefined && typeof def.deepens !== "string") {
    add("deepens_single", "Eine Vertiefung hat genau einen primären Core-Anker (deepens ist ein einzelner moduleId-Text).");
  }
  if (typeof def.deepens === "string" && def.deepens === def.moduleId) {
    add("deepens_self", "Eine Vertiefung kann sich nicht selbst vertiefen.");
  }
  if (def.tier === "core" && def.deepens !== undefined) {
    add("deepens_core", "Ein Core-Modul vertieft nichts (kein deepens).");
  }
  if (def.scope === "team" && def.deepens !== undefined) {
    add("deepens_team", "Team-Module haben keinen Profil-Anhang (kein deepens).");
  }

  // --- Renderer ------------------------------------------------------------
  const renderers = def.renderers;
  if (blank(renderers?.detail)) add("renderer_detail", "renderers.detail ist Pflicht.");
  if (renderers?.profileCard !== undefined && def.scope === "team") {
    add("team_profile_card", "Team-Module haben keinen Profil-Anhang (kein profileCard).");
  }
  if (def.scope === "team" && blank(renderers?.teamView)) {
    add("team_view", "Team-Module brauchen eine teamView.");
  }
  if (renderers?.teamView !== undefined && def.scope !== "team") {
    add("team_view", "teamView gibt es nur bei Team-Modulen.");
  }
  if (def.scope === "team" && storage !== "rounds") {
    add("team_storage", "Team-Module speichern in Runden (storage = rounds).");
  }
  if (renderers?.comparison !== undefined && (!def.compare || def.compare.length === 0)) {
    add("comparison_without_contract", "Ein Vergleichs-Renderer braucht einen definierten Compare Contract.");
  }

  // --- Compare Contract ----------------------------------------------------
  for (const rule of def.compare ?? []) {
    if (blank(rule.target)) add("compare_target", "Eine Vergleichsregel braucht ein target.");
    if (!oneOf(COMPARE_METHODS, rule.method)) add("compare_method", `Ungueltige Methode: ${String(rule.method)}`);
    if (!oneOf(COMPARE_STANCES, rule.stance)) add("compare_stance", `Ungueltige Stance: ${String(rule.stance)}`);
  }

  // --- Research ------------------------------------------------------------
  if (def.usage === "research_only") {
    const productRenderers = ["profileCard", "comparison", "teamView"] as const;
    for (const key of productRenderers) {
      if (renderers?.[key] !== undefined) add("research_renderer", `research_only darf keinen Produkt-Renderer haben (${key}).`);
    }
    if (def.compare && def.compare.length > 0) add("research_compare", "research_only darf keinen Compare Contract haben.");
    if (def.setupHandoff && def.setupHandoff.length > 0) add("research_handoff", "research_only darf keinen Setup-Handoff haben.");
    if (sharing?.ceiling !== "owner_only") add("research_sharing", "research_only bleibt owner_only.");
  }

  // --- Setup-Handoff -------------------------------------------------------
  for (const handoff of def.setupHandoff ?? []) {
    if (!oneOf(SETUP_HANDOFF_WHEN, handoff.when)) add("handoff_when", `Ungueltiges when: ${String(handoff.when)}`);
    if (env.setupItemKeys && !env.setupItemKeys.includes(handoff.target)) {
      add("handoff_target", `Setup-Thema existiert nicht im Katalog: ${String(handoff.target)}`);
    }
  }

  // --- Sprachtexte ---------------------------------------------------------
  if (blank(def.i18n?.namespace)) {
    add("i18n", "i18n.namespace fehlt.");
  } else if (env.hasMessage) {
    for (const locale of ["de", "en"] as const) {
      for (const key of moduleMessageKeys(id)) {
        if (!env.hasMessage(locale, def.i18n.namespace, key)) {
          add("i18n_messages", `Text fehlt (${locale}): ${def.i18n.namespace}.${key}`);
        }
      }
    }
  }

  return issues;
}

/** Prueft die ganze Registry: jedes Modul einzeln plus alles, was nur zwischen Modulen gilt. */
export function validateModuleRegistry(
  defs: readonly ModuleDefinition[],
  env: ModuleContractEnv = {}
): ModuleContractIssue[] {
  const issues = defs.flatMap((def) => validateModuleDefinition(def, env));

  const ids = new Set<string>();
  for (const def of defs) {
    if (ids.has(def.moduleId)) {
      issues.push({ moduleId: def.moduleId, rule: "module_id_unique", message: `moduleId doppelt: ${def.moduleId}` });
    }
    ids.add(def.moduleId);
  }

  // Die Vertiefung zeigt auf ein Core-Modul desselben Scopes - Person und Vorhaben bleiben getrennt.
  for (const def of defs) {
    if (!def.deepens) continue;
    const target = defs.find((candidate) => candidate.moduleId === def.deepens);
    if (!target) {
      issues.push({ moduleId: def.moduleId, rule: "deepens_target", message: `deepens zeigt auf ein unbekanntes Modul: ${def.deepens}` });
    } else if (target.tier !== "core") {
      issues.push({ moduleId: def.moduleId, rule: "deepens_target", message: `${def.deepens} ist kein Core-Modul.` });
    } else if (target.scope !== def.scope) {
      issues.push({
        moduleId: def.moduleId,
        rule: "deepens_scope",
        message: `Scope ${def.scope} vertieft ein Modul mit Scope ${target.scope} (${def.deepens}).`,
      });
    }
  }

  // Eine Instrument-ID gehoert hoechstens einem Modul.
  const owner = new Map<string, string>();
  for (const def of defs) {
    for (const version of def.versions ?? []) {
      if (!version.instrumentId) continue;
      const known = owner.get(version.instrumentId);
      if (known && known !== def.moduleId) {
        issues.push({
          moduleId: def.moduleId,
          rule: "instrument_id_unique",
          message: `instrumentId ${version.instrumentId} gehoert schon zu ${known}.`,
        });
      }
      owner.set(version.instrumentId, def.moduleId);
    }
  }

  return issues;
}

export function assertModuleRegistry(defs: readonly ModuleDefinition[], env: ModuleContractEnv = {}) {
  const issues = validateModuleRegistry(defs, env);
  if (issues.length > 0) {
    throw new Error(
      `module_registry_invalid:\n${issues.map((issue) => `  [${issue.moduleId}] ${issue.rule}: ${issue.message}`).join("\n")}`
    );
  }
  return defs;
}
