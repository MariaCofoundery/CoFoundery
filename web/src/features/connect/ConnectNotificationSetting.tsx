import { setConnectEmailNotificationsAction } from "@/features/connect/connectActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Der Schalter fuer Connect-Benachrichtigungen.
 *
 * Erscheint nur bei Connect-Konten - eine Einstellung fuer etwas, das man
 * nicht hat, ist Rauschen. Ohne diesen Schalter waere es Post, die niemand
 * loswird, und das waere schlechter als keine Benachrichtigung.
 */
export function ConnectNotificationSetting({
  enabled,
  copy,
}: {
  enabled: boolean;
  copy: { title: string; text: string; on: string; off: string; state: string; pending: string };
}) {
  return (
    <form action={setConnectEmailNotificationsAction}>
      <h2 className="text-lg font-semibold text-slate-950">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy.text}</p>
      <p className="mt-3 text-sm font-medium text-slate-900">{copy.state}</p>
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <SubmitButton
        label={enabled ? copy.off : copy.on}
        pendingLabel={copy.pending}
        className="mt-4 min-h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold"
      />
    </form>
  );
}
