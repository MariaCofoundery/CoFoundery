import Link from "next/link";
import type { EventCompareResult, EventRecord } from "@/features/events/eventTypes";
import { getEventScaleSemanticLabel } from "@/features/events/eventProfile";
import { EventScaleTrack } from "@/features/events/EventScaleTrack";

type EventCompareViewProps = {
  event: EventRecord;
  result: EventCompareResult;
  backToCardHref: string;
  scanHref: string;
};

function scaleTagLabel(
  scaleKey: EventCompareResult["allScales"][number]["key"],
  tone: "common" | "difference"
) {
  const commonLabels = {
    vision_ambition: "aehnliche Richtung",
    tempo: "aehnlicher Zug",
    risk: "aehnliches Risikogefuehl",
    structure_roles: "aehnliche Rollenidee",
    sync: "aehnlicher Daily-Rhythmus",
    conflict_decision: "aehnliche Fuehrungslogik",
  } as const;

  const differenceLabels = {
    vision_ambition: "andere Ambitionslogik",
    tempo: "anderes Tempo",
    risk: "anderes Risikogefuehl",
    structure_roles: "andere Rollenidee",
    sync: "anderer Daily-Rhythmus",
    conflict_decision: "andere Fuehrungslogik",
  } as const;

  return tone === "common" ? commonLabels[scaleKey] : differenceLabels[scaleKey];
}

function buildDynamicTags(result: EventCompareResult) {
  const tags: Array<{ label: string; tone: "teal" | "sand" | "mauve" }> = [];
  const strongestCommon = result.commonGround[0];
  const strongestDifference = result.differences[0];

  if (strongestCommon) {
    tags.push({
      label: scaleTagLabel(strongestCommon.key, "common"),
      tone: "teal",
    });
  }

  if (strongestDifference) {
    tags.push({
      label: scaleTagLabel(strongestDifference.key, "difference"),
      tone: "mauve",
    });
  }

  if (result.tensionSignals.length > 0) {
    tags.push({
      label: "kann schnell Zug entwickeln",
      tone: "sand",
    });
  }

  return tags.slice(0, 3);
}

function dynamicToneLabel(distance: number) {
  if (distance <= 10) {
    return "hier tickt ihr erstaunlich aehnlich";
  }
  if (distance <= 20) {
    return "hier seid ihr ziemlich nah";
  }
  if (distance >= 55) {
    return "das kann richtig pushen - oder Reibung bringen";
  }
  if (distance >= 35) {
    return "hier bringt ihr ziemlich andere Energie mit";
  }
  return "hier setzt ihr andere Akzente";
}

function buildObservationLines(result: EventCompareResult) {
  const observationLines: string[] = [];

  for (const signal of result.tensionSignals) {
    switch (signal.tensionKey) {
      case "sync_vs_autonomy":
        observationLines.push(
          "Beim Alltagstakt koennte es schnell knistern: Eine Person braucht mehr Freiraum, die andere eher mehr Naehe im Loop."
        );
        break;
      case "risk_vs_stability":
        observationLines.push(
          "Beim Risiko bringt ihr ziemlich unterschiedliche Nerven mit. Das kann euch pushen - oder euch regelmaessig in Debatten ziehen."
        );
        break;
      case "roles_vs_shared":
        observationLines.push(
          "Bei Rollen und Verantwortung klingt es nicht nach derselben Idee. Genau da wuerdet ihr wahrscheinlich schnell merken, wie ihr Fuehrung wirklich lebt."
        );
        break;
      case "speed_vs_assurance":
        observationLines.push(
          "Bei Tempo und Absicherung wuerdet ihr wahrscheinlich nicht immer gleich reagieren. Das merkt man meist schnell, sobald es ernst wird."
        );
        break;
      case "exit_horizon":
        observationLines.push(
          "Beim Zeithorizont wirkt ihr nicht automatisch gleich. Genau daraus kann aber ein richtig gutes Gespraech entstehen."
        );
        break;
      default:
        break;
    }

    if (observationLines.length >= 2) {
      return observationLines;
    }
  }

  for (const difference of result.differences) {
    switch (difference.key) {
      case "sync":
        observationLines.push(
          "Im Alltag koennte schnell auffallen, dass ihr nicht gleich viel Naehe und Mitsicht wollt."
        );
        break;
      case "risk":
        observationLines.push(
          "Beim Risiko bringt ihr unterschiedliche Temperamente mit. Nicht schlimm - aber definitiv spannend."
        );
        break;
      case "structure_roles":
        observationLines.push(
          "Bei Rollen und Struktur koennten recht schnell unterschiedliche Erwartungen auftauchen."
        );
        break;
      case "conflict_decision":
        observationLines.push(
          "Wenn es knifflig wird, koenntet ihr ziemlich unterschiedlich direkt werden. Darueber lohnt sich wahrscheinlich frueh ein ehrliches Gespraech."
        );
        break;
      case "tempo":
        observationLines.push(
          "Beim Tempo koennte sich schnell zeigen, wer lieber sofort zieht und wer erst noch Luft holen will."
        );
        break;
      case "vision_ambition":
        observationLines.push(
          "Bei Ambition und Richtung klingt es nicht so, als hattet ihr sofort dieselbe Zukunft im Kopf."
        );
        break;
      default:
        break;
    }

    if (observationLines.length >= 2) {
      break;
    }
  }

  return observationLines;
}

function buildTeamDynamicSummary(result: EventCompareResult) {
  const strongestCommon = result.commonGround[0];
  const strongestDifference = result.differences[0];

  if (result.tensionSignals.length >= 2 && strongestDifference) {
    return `Ihr koenntet euch stark pushen - gerade weil ihr bei ${strongestDifference.label} nicht automatisch gleich tickt.`;
  }

  if (strongestCommon && strongestDifference) {
    return `Bei ${strongestCommon.label} wirkt ihr erstaunlich nah. Bei ${strongestDifference.label} kommt dafuer spuerbar eigene Energie rein.`;
  }

  if (strongestDifference) {
    return "Ihr wirkt nicht wie ein glattes Match, eher wie ein Duo mit eigener Energie und ein paar Stellen, an denen es spannend werden koennte.";
  }

  if (strongestCommon) {
    return `Ihr wirkt auf den ersten Blick ziemlich eingespielt. Vor allem bei ${strongestCommon.label} seid ihr nah beieinander.`;
  }

  return "Ein schneller Blick darauf, wie ihr als potenzielles Gruenderteam wirken koenntet.";
}

function CompareScaleCard({
  title,
  leftName,
  rightName,
  scoreA,
  scoreB,
  dynamicLabel,
  scaleKey,
}: {
  title: string;
  leftName: string;
  rightName: string;
  scoreA: number;
  scoreB: number;
  dynamicLabel: string;
  scaleKey: EventCompareResult["allScales"][number]["key"];
}) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.94))] px-4 py-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50/85 px-2.5 py-1 text-[11px] leading-5 text-slate-600">
          {dynamicLabel}
        </span>
      </div>

      <div className="mt-3.5 space-y-3">
        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs font-medium text-slate-800">{leftName}</div>
            <div className="text-right text-xs leading-5 text-slate-600">
              {getEventScaleSemanticLabel(scaleKey, scoreA)}
            </div>
          </div>
          <div className="mt-1.5 min-w-0">
            <EventScaleTrack score={scoreA} variant="self" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs font-medium text-slate-800">{rightName}</div>
            <div className="text-right text-xs leading-5 text-slate-600">
              {getEventScaleSemanticLabel(scaleKey, scoreB)}
            </div>
          </div>
          <div className="mt-1.5 min-w-0">
            <EventScaleTrack score={scoreB} variant="other" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function EventCompareView({ event, result, backToCardHref, scanHref }: EventCompareViewProps) {
  const observationLines = buildObservationLines(result);
  const teamDynamicSummary = buildTeamDynamicSummary(result);
  const dynamicTags = buildDynamicTags(result);

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Founder Chemistry</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          Du + {result.participantBName}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          {teamDynamicSummary}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Kein Score und kein Urteil. Eher ein schneller Blick darauf, wo ihr wahrscheinlich sofort klickt - und wo es interessant werden koennte.
        </p>
        {dynamicTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {dynamicTags.map((tag) => {
              const toneClass =
                tag.tone === "teal"
                  ? "border-[#bfe8ef] bg-[#eef8fa] text-[#0f6d80]"
                  : tag.tone === "mauve"
                    ? "border-[#e3d8f8] bg-[#f5f0ff] text-[#6a42c2]"
                    : "border-[#f2dfb3] bg-[#fff7e6] text-[#9a6a10]";

              return (
                <span
                  key={`${tag.tone}-${tag.label}`}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.01em] ${toneClass}`}
                >
                  {tag.label}
                </span>
              );
            })}
          </div>
        ) : null}
        <p className="mt-2 text-xs leading-6 text-slate-500">{event.name}</p>
      </div>

      <div className="mt-6 space-y-5">
        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Eure Gruender-Dynamik</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Alle Skalen auf einen Blick. Nicht, um euch festzulegen, sondern um schnell zu sehen, wo es zwischen euch klickt, zieht oder knirschen koennte.
            </p>
          </div>
          <div className="space-y-3">
            {result.allScales.map((entry) => (
              <CompareScaleCard
                key={`scale-${entry.key}`}
                title={entry.label}
                leftName="Du"
                rightName={result.participantBName}
                scoreA={entry.scoreA}
                scoreB={entry.scoreB}
                dynamicLabel={dynamicToneLabel(entry.distance)}
                scaleKey={entry.key}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Wo es spannend werden koennte</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Nicht als Warnung gedacht. Eher als die Stellen, an denen zwischen euch am ehesten Energie, Zug oder Diskussion entsteht.
            </p>
          </div>
          <div className="space-y-3">
            {observationLines.length > 0 ? (
              observationLines.map((line, index) => (
                <article
                  key={`${index}-${line}`}
                  className="rounded-2xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(254,243,199,0.35),rgba(255,255,255,0.98))] px-4 py-4 shadow-[0_12px_26px_rgba(120,53,15,0.03)]"
                >
                  <p className="text-sm leading-6 text-slate-700">{line}</p>
                </article>
              ))
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
                Auf den ersten Blick springt kein grosses Spannungsfeld raus. Genau deshalb lohnt sich der zweite Blick oft trotzdem.
              </article>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Gespraechsimpulse</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Wenn ihr noch zwei Minuten weiterreden wollt, fangt hier an.
            </p>
          </div>
          <div className="space-y-3">
            {result.conversationPrompts.map((prompt, index) => (
              <article
                key={`${index}-${prompt}`}
                className="rounded-2xl border border-[#dde7e4] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              >
                <p className="text-sm leading-7 text-slate-800">{prompt}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-slate-500">
          Kurz, direkt und eher als Conversation Starter gedacht als als fertiges Urteil.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={scanHref}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Naechsten QR-Code scannen
          </Link>
          <Link
            href={backToCardHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Zurueck zu meiner Event-Karte
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Naechster Schritt</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Wollt ihr tiefer einsteigen?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Der Event-Check zeigt euch erste Dynamiken. Im vollstaendigen Cofoundery-Matching geht ihr genauer rein:
            Persoenlichkeit, Werte, Zusammenarbeit und gemeinsamer Report.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Ihr koennt den Event-Vergleich weiter nutzen - oder spaeter mit mehr Tiefe weitermachen.
          </p>
        </div>
        <div className="mt-4">
          <Link
            href="/invite/new"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
          >
            Vollstaendiges Matching starten
          </Link>
        </div>
      </section>
    </section>
  );
}
