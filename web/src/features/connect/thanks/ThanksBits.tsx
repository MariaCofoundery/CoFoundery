import type { MyThanks, ProfileThanks } from "./thanksData";
import { setThanksHiddenAction } from "./thanksActions";
import { ConnectSubmitButton } from "@/features/connect/ConnectSubmitButton";

type T = (key: string, values?: Record<string, string | number>) => string;

const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 5 6.3 5c2 0 3.5 1 4.2 2.4h3C14.2 6 15.7 5 17.7 5 21 5 23.2 8.2 21.6 11.8 19.5 16.4 12 21 12 21z";

/** Ein Zeichen, keine Zahl: steht da oder nicht. */
export function HeartBadge({ label }: { label: string }) {
  return (
    <span title={label} data-connect-heart className="inline-flex items-center gap-1.5 rounded-full bg-[#fde7f0] py-0.5 pl-2 pr-2.5 text-[13px] font-semibold text-[#a81f55]">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#d4286b" aria-hidden="true"><path d={HEART_PATH} /></svg>{label}
    </span>
  );
}

function Chips({ types, outcome, t }: { types: string[]; outcome: string | null; t: T }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((type) => <span key={type} className="rounded-full bg-[#efeaff] px-2.5 py-0.5 text-xs font-semibold text-[#4b2bb8]">{t(`thanks.types.${type}`)}</span>)}
      {outcome && outcome !== "open" ? <span className="rounded-full bg-[#e5f6ee] px-2.5 py-0.5 text-xs font-semibold text-[#0a6b52]">{t(`thanks.outcomes.${outcome}`)}</span> : null}
    </div>
  );
}

/** Auf dem Profil: nur Worte, die die dankende Person freigegeben hat. */
export function ProfileThanksList({ items, t, label }: { items: ProfileThanks[]; t: T; label: string }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-4 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-label={label}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">{label}</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={index}>
            <Chips types={item.helpTypes} outcome={item.outcome} t={t} />
            <p className="mt-2 text-[17px] italic leading-7 text-[#14152b]">„{item.body}“</p>
            {item.firstName ? <p className="mt-1 text-[13px] text-[#4a4d68]">{item.firstName}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-5 text-[#4a4d68]">{t("thanks.profileNote")}</p>
    </section>
  );
}

/** Auf der Kontakte-Seite: ein Dank, den ich bekommen habe. Mit Wahl, ob er auf dem Profil steht. */
export function ReceivedThanksCard({ thanks, t }: { thanks: MyThanks; t: T }) {
  return (
    <article className="rounded-2xl border border-pink-200 bg-pink-50/50 p-5" data-connect-thanks-received>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fde7f0]"><svg viewBox="0 0 24 24" width="22" height="22" fill="#d4286b" aria-hidden="true"><path d={HEART_PATH} /></svg></span>
        <h3 className="text-base font-semibold text-slate-950">{thanks.otherName ? t("thanks.receivedFrom", { name: thanks.otherName }) : t("thanks.received")}</h3>
      </div>
      <div className="mt-3"><Chips types={thanks.helpTypes} outcome={thanks.outcome} t={t} /></div>
      {thanks.body ? <p className="mt-3 text-[17px] italic leading-7 text-slate-900">„{thanks.body}“</p> : null}
      {thanks.showOnProfile ? (
        <form action={setThanksHiddenAction} className="mt-3">
          <input type="hidden" name="id" value={thanks.id} />
          <input type="hidden" name="hidden" value={thanks.hidden ? "0" : "1"} />
          <p className="text-sm text-slate-600">{thanks.hidden ? t("thanks.hiddenNote") : t("thanks.allowedNote")}</p>
          <ConnectSubmitButton label={thanks.hidden ? t("thanks.show") : t("thanks.hide")} pendingLabel="…" className="mt-2 min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold" />
        </form>
      ) : thanks.body ? <p className="mt-3 text-sm text-slate-600">{t("thanks.privateNote")}</p> : null}
    </article>
  );
}
