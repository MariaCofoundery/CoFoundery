import type { CropOutput } from "@/features/ui/ImageCropDialog";

/**
 * Wie ein Profilbild gespeichert wird - an einer Stelle, fuer Einstieg und Profil.
 *
 * HERAUSGELOEST AM 01.10.2026 aus `ProfileBasicsForm`. Dort stand sie seit
 * dem Einstiegsassistenten; seit das Foto auch unter „Ueber dich" aenderbar
 * ist, brauchen es zwei Stellen. Eine zweite Fassung haette nach dem ersten
 * Unterschied zwei verschiedene Bildgroessen ergeben - und zwar lautlos.
 *
 * 320 PIXEL UND JPEG. Seit 04.11.2026 entsteht das Bild im Zuschnitt
 * (`ImageCropDialog`, Feedback an Maria: "den Bildausschnitt veraendern
 * koennen"): quadratisch, so wie es in Listen und Koepfen erscheint. Keine
 * Filter, keine Gesichtserkennung.
 *
 * Verkleinert wird IM BROWSER. Die Datei, die jemand auswaehlt, kann zehn
 * Megabyte haben; was den Server erreicht, sind rund dreissig Kilobyte.
 */
export const AVATAR_IMAGE_OUTPUT: CropOutput = { size: 320, type: "image/jpeg", quality: 0.82 };
