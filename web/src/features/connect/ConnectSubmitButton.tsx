/**
 * Der Knopf ist nach features/ui/SubmitButton gezogen, weil er nie
 * connect-spezifisch war - sein Name hat ihn nur dort gehalten. Dieser
 * Re-Export haelt die Bestandsstellen am Laufen; neue Stellen importieren
 * direkt aus features/ui.
 */
export { SubmitButton as ConnectSubmitButton } from "@/features/ui/SubmitButton";
