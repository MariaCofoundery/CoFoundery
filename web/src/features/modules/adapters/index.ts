import {
  capabilityAdapter,
  directionAdapter,
  strengthsAdapter,
  workstyleAdapter,
} from "@/features/modules/adapters/personModules";
import { ventureCoreAdapter } from "@/features/modules/adapters/ventureCore";
import type { ModuleAdapter } from "@/features/modules/types";

/** Die fuenf read-only Adapter der Bestandsmodule, nach `moduleId`. */
export const MODULE_ADAPTERS: Readonly<Record<string, ModuleAdapter>> = {
  workstyle: workstyleAdapter,
  strengths: strengthsAdapter,
  capability: capabilityAdapter,
  direction: directionAdapter,
  venture_core: ventureCoreAdapter,
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
};
