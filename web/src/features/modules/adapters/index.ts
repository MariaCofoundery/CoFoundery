import {
  capabilityAdapter,
  directionAdapter,
  strengthsAdapter,
  workstyleAdapter,
} from "@/features/modules/adapters/personModules";
import { ventureCoreAdapter } from "@/features/modules/adapters/ventureCore";
import { ventureCoreBetaAdapter } from "@/features/modules/adapters/ventureCoreBeta";
import { ventureTradeoffsAdapter } from "@/features/modules/adapters/ventureTradeoffs";
import type { ModuleAdapter } from "@/features/modules/types";

/** Die Adapter der registrierten Module, nach `moduleId`: fuenf read-only fuer den Bestand und der des nativen Moduls. */
export const MODULE_ADAPTERS: Readonly<Record<string, ModuleAdapter>> = {
  workstyle: workstyleAdapter,
  strengths: strengthsAdapter,
  capability: capabilityAdapter,
  direction: directionAdapter,
  venture_core: ventureCoreAdapter,
  venture_tradeoffs: ventureTradeoffsAdapter,
  venture_core_beta: ventureCoreBetaAdapter,
};

export function getModuleAdapter(moduleId: string): ModuleAdapter | null {
  return MODULE_ADAPTERS[moduleId] ?? null;
}

export {
  capabilityAdapter,
  directionAdapter,
  strengthsAdapter,
  workstyleAdapter,
  ventureCoreAdapter,
  ventureTradeoffsAdapter,
  ventureCoreBetaAdapter,
};
