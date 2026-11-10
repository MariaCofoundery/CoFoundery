import { getTranslations } from "next-intl/server";
import { deleteAiFlowAction, deleteAiToolAction, saveAiFlowAction, saveAiItemAction, saveAiToolAction } from "@/features/aiStart/aiStartActions";
import { AI_ITEM_KEYS, AI_TOOL_MODES, clearedCount, flowCounts, type AiFlow, type AiItem, type AiTool } from "@/features/aiStart/aiStartModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

const CARD = "rounded-3xl border border-[#e4e2f0] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";
const GHOST = "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50";
const MODE_CHIP: Record<string, string> = { hand: "bg-slate-200 text-slate-900", part: "bg-amber-100 text-amber-900", auto: "bg-emerald-100 text-emerald-900" };
const NEW_STEPS = 5;

/**
 * "So startet ihr KI-nativ" (Entwurf 09.11.2026): acht Fragen zum Abhaken mit Notiz, dann die Werkzeuge des Teams und seine
 * Ablaeufe. Die Haken und Eintraege gehoeren dem Team; die Leiste zeigt nur den Stand, keine Bewertung. Das Tool ruft keine KI auf.
 */
export async function AiStartView({
  teamId,
  members,
  items,
  tools,
  flows,
}: {
  teamId: string;
  members: { userId: string; name: string }[];
  items: AiItem[];
  tools: AiTool[];
  flows: AiFlow[];
}) {
  const t = await getTranslations("teams.aiStart");
  const byKey = new Map(items.map((item) => [item.key, item]));
  const cleared = clearedCount(items);
  const nameOf = (userId: string | null) => (userId === "system" ? t("flows.system") : members.find((member) => member.userId === userId)?.name ?? t("flows.nobody"));
  const soloAccess = tools.filter((tool) => tool.accessUserIds.length === 1 && members.length > 1);
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return (
    <div className="mt-5 grid gap-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <b>{t("progress", { done: cleared, total: AI_ITEM_KEYS.length })}</b>
        <span aria-hidden="true" className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-200"><span className="block h-1.5 rounded-full bg-[#6D49E0]" style={{ width: `${(cleared / AI_ITEM_KEYS.length) * 100}%` }} /></span>
        <span className="text-[12.5px] text-slate-600">{t("progressNote")}</span>
      </div>

      <ol className="grid gap-3">
        {AI_ITEM_KEYS.map((key, index) => {
          const item = byKey.get(key);
          const state = item?.state;
          return (
            <li key={key} id={`frage-${key}`} className={`${CARD} scroll-mt-24 ${state === "skip" ? "opacity-70" : ""}`}>
              <form action={saveAiItemAction} className="grid gap-3">
                {hidden("teamId", teamId)}
                {hidden("itemKey", key)}
                <div className="flex items-start gap-3.5">
                  <span aria-hidden="true" className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-[15px] font-bold text-white ${state === "done" ? "border-emerald-700 bg-emerald-700" : state === "skip" ? "border-slate-400 bg-slate-400" : "border-slate-400 bg-white"}`}>{state === "done" ? "✓" : state === "skip" ? "–" : ""}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-bold text-[#0b1f3a]">{index + 1}. {t(`items.${key}.title`)}</h2>
                    <p className="mt-1 text-[14px] leading-6 text-slate-700">{t(`items.${key}.hint`)}</p>
                  </div>
                </div>
                <label className="sm:ml-[42px]">
                  <span className="block text-xs font-semibold text-slate-600">{t("note")}</span>
                  <input name="note" maxLength={500} defaultValue={item?.note ?? ""} placeholder={t(`items.${key}.placeholder`)} className={`${TILE_INPUT} mt-1 w-full`} />
                </label>
                <div className="flex flex-wrap gap-2 sm:ml-[42px]">
                  <SubmitButton fieldName="state" intent="done" label={state === "done" ? t("update") : t("markDone")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white" />
                  <SubmitButton fieldName="state" intent="skip" label={t("markSkip")} pendingLabel="…" className={GHOST} />
                  {state ? <SubmitButton label={t("reopen")} pendingLabel="…" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline" /> : null}
                  {key === "tools" ? <a href="#werkzeuge" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("toTools")}</a> : null}
                </div>
              </form>
            </li>
          );
        })}
      </ol>

      <section id="werkzeuge" aria-labelledby="ai-tools-title" className={`${CARD} scroll-mt-24 grid gap-4`}>
        <div>
          <h2 id="ai-tools-title" className="text-xl font-semibold text-[#0b1f3a]">{t("tools.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">{t("tools.intro")}</p>
        </div>
        {tools.length === 0 ? <p className="text-sm text-slate-600">{t("tools.none")}</p> : (
          <ul className="grid gap-2">
            {tools.map((tool) => (
              <li key={tool.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <b className="text-[15px]">{tool.name}</b>
                  <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12.5px] font-bold ${MODE_CHIP[tool.mode]}`}>{t(`modes.${tool.mode}`)}</span>
                  {tool.purpose ? <span className="text-[13.5px] text-slate-600">{tool.purpose}</span> : null}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-slate-700">
                  {t("tools.access")}: {tool.accessUserIds.length ? tool.accessUserIds.map((id) => nameOf(id)).join(", ") : t("tools.accessNone")}
                  {tool.connectedTo ? ` · ${t("tools.connected")}: ${tool.connectedTo}` : ""}
                </p>
                <details className="mt-1">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("edit")}</summary>
                  <div className="grid gap-3 pt-1">
                    {toolForm({ t, teamId, members, tool })}
                    <form action={deleteAiToolAction}>
                      {hidden("teamId", teamId)}
                      {hidden("id", tool.id)}
                      <SubmitButton label={t("remove")} pendingLabel="…" className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-800 underline-offset-4 hover:underline" />
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        {soloAccess.length > 0 ? (
          <p role="note" className="rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] leading-5 text-amber-950"><b>{t("tools.discussTitle")}</b> {t("tools.discuss", { names: soloAccess.map((tool) => `${tool.name} (${nameOf(tool.accessUserIds[0])})`).join(", ") })}</p>
        ) : null}
        <details className="rounded-2xl border-[1.5px] border-dashed border-slate-300 p-4" open={tools.length === 0}>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">+ {t("tools.add")}</summary>
          <div className="pt-2">{toolForm({ t, teamId, members, tool: null })}</div>
        </details>
      </section>

      <section id="ablaeufe" aria-labelledby="ai-flows-title" className={`${CARD} scroll-mt-24 grid gap-4`}>
        <div>
          <h2 id="ai-flows-title" className="text-xl font-semibold text-[#0b1f3a]">{t("flows.title")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">{t("flows.intro")}</p>
        </div>
        {flows.map((flow) => {
          const counts = flowCounts(flow.steps);
          return (
            <article key={flow.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-[15.5px] font-bold">{flow.name}</h3>
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {flow.steps.map((step, index) => (
                  <li key={index} className="flex flex-col gap-1.5">
                    <div className={`flex min-h-20 flex-col gap-1 rounded-xl border-2 p-3 ${step.mode === "auto" ? "border-emerald-700 bg-emerald-50" : "border-slate-300 bg-white"}`}>
                      <b className="text-[13.5px] leading-5">{step.text}</b>
                      <span className="text-[12.5px] text-slate-700">{nameOf(step.who)}</span>
                    </div>
                    <span className={`inline-flex h-6 items-center self-start rounded-full px-2.5 text-[12px] font-bold ${step.mode === "auto" ? MODE_CHIP.auto : MODE_CHIP.hand}`}>{t(`stepModes.${step.mode}`)}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[13.5px] text-slate-700">{t("flows.counts", { hand: counts.hand, auto: counts.auto })}</p>
              <details>
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("edit")}</summary>
                <div className="grid gap-3 pt-1">
                  {flowForm({ t, teamId, members, flow })}
                  <form action={deleteAiFlowAction}>
                    {hidden("teamId", teamId)}
                    {hidden("id", flow.id)}
                    <SubmitButton label={t("remove")} pendingLabel="…" className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-800 underline-offset-4 hover:underline" />
                  </form>
                </div>
              </details>
            </article>
          );
        })}
        <details className="rounded-2xl border-[1.5px] border-dashed border-slate-300 p-4" open={flows.length === 0}>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-violet-800">+ {t("flows.add")}</summary>
          <div className="pt-2">{flowForm({ t, teamId, members, flow: null })}</div>
        </details>
      </section>

      <p className="rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">{t("privacy")}</p>
    </div>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations>>;
type Members = { userId: string; name: string }[];

function toolForm({ t, teamId, members, tool }: { t: Translate; teamId: string; members: Members; tool: AiTool | null }) {
  return (
    <form action={saveAiToolAction} className="grid gap-3">
      <input type="hidden" name="teamId" value={teamId} />
      {tool ? <input type="hidden" name="id" value={tool.id} /> : null}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className={TILE}><span className={TILE_LABEL}>{t("tools.name")}</span><input name="name" required maxLength={80} defaultValue={tool?.name ?? ""} className={TILE_INPUT} /></label>
        <label className={TILE}><span className={TILE_LABEL}>{t("tools.purpose")}</span><input name="purpose" maxLength={200} defaultValue={tool?.purpose ?? ""} className={TILE_INPUT} /></label>
        <label className={TILE}>
          <span className={TILE_LABEL}>{t("tools.runs")}</span>
          <select name="mode" defaultValue={tool?.mode ?? "hand"} className={TILE_INPUT}>{AI_TOOL_MODES.map((mode) => <option key={mode} value={mode}>{t(`modes.${mode}`)}</option>)}</select>
        </label>
        <label className={TILE}><span className={TILE_LABEL}>{t("tools.connected")}</span><input name="connectedTo" maxLength={200} defaultValue={tool?.connectedTo ?? ""} className={TILE_INPUT} /></label>
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="text-[13px] font-bold text-slate-700">{t("tools.access")}</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label key={member.userId} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-slate-300 bg-white px-3.5 text-[13.5px] font-semibold text-slate-800 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50">
              <input type="checkbox" name="access" value={member.userId} defaultChecked={tool?.accessUserIds.includes(member.userId)} className="size-4" />
              {member.name}
            </label>
          ))}
        </div>
        <span className="text-xs text-slate-600">{t("tools.accessHint")}</span>
      </fieldset>
      <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-11 items-center self-start rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white" />
    </form>
  );
}

function flowForm({ t, teamId, members, flow }: { t: Translate; teamId: string; members: Members; flow: AiFlow | null }) {
  const rows = Array.from({ length: Math.max(NEW_STEPS, (flow?.steps.length ?? 0) + 1) }, (_, index) => flow?.steps[index] ?? null);
  return (
    <form action={saveAiFlowAction} className="grid gap-3">
      <input type="hidden" name="teamId" value={teamId} />
      {flow ? <input type="hidden" name="id" value={flow.id} /> : null}
      <label className={TILE}><span className={TILE_LABEL}>{t("flows.name")}</span><input name="name" required maxLength={120} defaultValue={flow?.name ?? ""} placeholder={t("flows.namePlaceholder")} className={TILE_INPUT} /></label>
      <div className="grid gap-2">
        {rows.map((step, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <input name="stepText" maxLength={120} defaultValue={step?.text ?? ""} placeholder={t("flows.stepPlaceholder", { number: index + 1 })} aria-label={t("flows.stepPlaceholder", { number: index + 1 })} className={`${TILE_INPUT} w-full`} />
            <select name="stepWho" defaultValue={step?.who ?? ""} aria-label={t("flows.who")} className={TILE_INPUT}>
              <option value="">{t("flows.nobody")}</option>
              <option value="system">{t("flows.system")}</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
            </select>
            <select name="stepMode" defaultValue={step?.mode ?? "hand"} aria-label={t("flows.how")} className={TILE_INPUT}>
              <option value="hand">{t("stepModes.hand")}</option>
              <option value="auto">{t("stepModes.auto")}</option>
            </select>
          </div>
        ))}
      </div>
      <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-11 items-center self-start rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white" />
    </form>
  );
}
