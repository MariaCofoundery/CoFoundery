import { redirect } from "next/navigation";

/**
 * Phase 10 - Cutover (REDIRECT_TO_CURRENT): Abschlussseite des frueheren
 * Fragebogens. Er wird nicht mehr ausgefuellt; frueher Abgegebenes steht
 * datiert unter /me/profile.
 */
export default function Page() {
  redirect("/me/profile");
}
