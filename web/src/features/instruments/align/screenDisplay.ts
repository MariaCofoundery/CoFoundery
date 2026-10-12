import profile from "./screens.profile.en.json";
import venture from "./screens.venture.en.json";
import type { AppLocale } from "@/i18n/config";
import type { ScreenSet } from "@/features/instruments/align/screens";

/** Copy only. The source still controls steps, items, ordering and validation. */
export function alignmentScreens(source: ScreenSet, locale: AppLocale): ScreenSet {
  if (locale !== "en") return source;
  const copy = source.scope === "founder_profile" ? profile : venture;
  if (source.screens.length !== copy.screens.length) throw new Error("alignment_screen_copy_incomplete");
  return { ...source, intro: { ...source.intro, ...copy.intro },
    nameQuestion: source.nameQuestion && copy.nameQuestion ? { ...source.nameQuestion, ...copy.nameQuestion } : null,
    screens: source.screens.map((screen, index) => ({ ...screen, ...copy.screens[index] })),
    closing: { ...source.closing, ...copy.closing },
  };
}
