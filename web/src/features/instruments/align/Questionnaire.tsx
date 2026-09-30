"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import type { SectionView } from "@/features/instruments/v21/questionnaireDataV21";
import { completenessV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import type { AnswerableItem } from "@/features/instruments/v21/answersV21";
import { clearAnswer, saveAnswer, submitScope } from "@/features/instruments/align/answerActions";
import { setVentureName } from "@/features/instruments/align/ventureActions";
import {
  noteItemAnswered,
  noteItemSeen,
} from "@/features/instruments/v21/itemViewActions";
import type { AssessmentScope } from "@/features/instruments/align/registries";
import type { ScreenSet } from "@/features/instruments/align/screens";
import { questionBlocks } from "@/features/instruments/align/questionBlocks";

type SaveState = "idle" | "saving" | "saved" | "incomplete" | "error";

type Props = {
  scope: AssessmentScope;
  /**
   * Zu welchem Vorhaben die Antworten gehören.
   *
   * Beim Arbeitsprofil `null`. Beim Venture-Bogen muss es MITKOMMEN: Wer in
   * zwei Vorhaben ist, hat auf der Seite davor gewählt, und ohne diese Angabe
   * würde die Serveraktion neu raten - und bei mehreren aufgeben.
   */
  ventureId?: string | null;
  sections: SectionView[];
  /** Was die Antwortprüfung je Frage braucht - ohne die ganze Registratur. */
  answerable: Record<string, AnswerableItem>;
  initialAnswers: Record<string, DraftV21>;
  submitted: boolean;
  /**
   * Schritte statt einer langen Liste.
   *
   * Beide Bögen haben sie seit dem 30.09.2026 — das Arbeitsprofil sieben, das
   * Venture-Alignment neun. Ohne diese Angabe bleibt die Abschnittsliste, wie
   * sie war.
   */
  screens: ScreenSet;
  /**
   * Wie das Vorhaben heißt — oder `null`, solange niemand es benannt hat.
   *
   * DIE FRAGE STEHT AUF DER STARTSEITE. „Wie heißt dein Vorhaben?" ist die
   * erste Frage des zweiten Teils, nicht ein Feld in einem Verwaltungsbereich.
   * Steht schon ein Name da, wird nicht gefragt.
   */
  ventureName?: string | null;
  /**
   * Wohin es nach dem Abgeben geht.
   *
   * ---------------------------------------------------------------------------
   * ES MUSS ETWAS PASSIEREN
   * ---------------------------------------------------------------------------
   *
   * Gemeldet am 30.09.2026: Nach „Founder-Profil erstellen“ blieb man stehen,
   * wo man war, und ein Satz sagte, es sei abgegeben. Das ist der Moment, in
   * dem die meiste Arbeit hinter einem liegt — und er fühlte sich an wie
   * nichts.
   */
  afterSubmit?: string | null;
};

/**
 * Der Fragebogen - für beide Bögen.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD LAUFEND GESPEICHERT
 * ---------------------------------------------------------------------------
 *
 * Kein „Weiter“-Knopf, der eine Seite abschließt. Wer beim Ausfüllen etwas
 * verliert, füllt kein zweites Mal aus.
 *
 * EINE HALBE EINGABE IST KEIN FEHLER. Der Autospeicher feuert mitten hinein;
 * wer „bitte beschreiben“ ankreuzt, bekam früher eine rote Meldung, bevor der
 * Cursor im Feld war. „Mittendrin“ heißt jetzt: nicht speichern, nicht
 * meckern, und vor allem nicht überschreiben, was schon dasteht.
 *
 * KEIN FORTSCHRITT IN PROZENT. Die Anzeige sagt „12 von 16 beantwortet“ und
 * sonst nichts. Keine Auswertung beim Ausfüllen, am Ende keine Zahl.
 */
export function Questionnaire({
  scope, ventureId = null, sections, answerable, initialAnswers, submitted, screens,
  ventureName = null, afterSubmit = null,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, DraftV21>>(initialAnswers);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [submitting, setSubmitting] = useState(false);
  /** Warum die Abgabe nicht geklappt hat. Leer heißt: kein Versuch gescheitert. */
  const [submitError, setSubmitError] = useState("");

  /**
   * Steht etwas auf dem Schirm, das nicht in der Datenbank ist?
   *
   * DANN DARF NICHT ABGEGEBEN WERDEN. Sonst friert die Abgabe einen Stand
   * ein, den die Person vor sich sieht und der so nirgends gespeichert ist -
   * und danach laesst er sich nicht mehr ändern.
   */
  const nichtGespeichert = () =>
    Object.entries(states).filter(([, state]) => state === "error" || state === "saving");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const router = useRouter();

  /**
   * Schritt 0 ist die Einleitung, 1 bis 7 sind die Bildschirme.
   *
   * WER SCHON GEANTWORTET HAT, LIEST DIE EINLEITUNG NICHT NOCH EINMAL. Sie
   * begrüßt und erklärt, worum es geht - beim dritten Mal ist sie eine Tür,
   * die man jedes Mal aufschieben muss.
   */
  const [step, setStep] = useState(() =>
    Object.keys(initialAnswers).length === 0 ? 0 : 1,
  );

  /**
   * Beim Schrittwechsel nach oben.
   *
   * GEMELDET AM 30.09.2026: „Wenn man weiter klickt, sollte man immer im
   * nächsten Bereich oben landen." Der Knopf steht unten; ohne diesen Sprung
   * beginnt der nächste Schritt mitten in seinen Fragen, und die Überleitung,
   * die erklärt, worum es jetzt geht, hat man nie gesehen.
   *
   * `auto` und nicht `smooth`: Wer zügig durchklickt, wartet sonst bei jedem
   * Schritt auf eine Animation.
   */
  const zuSchritt = (naechster: number) => {
    setStep(naechster);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  };

  /**
   * Der Arbeitstitel des Vorhabens.
   *
   * Er wird beim Weitergehen gespeichert und nicht mit einem eigenen
   * Speicherknopf: Ein Feld, das man ausfüllt, und ein Knopf, der weitergeht,
   * sind ein Schritt und nicht zwei.
   */
  const [name, setName] = useState(ventureName ?? "");
  const [nameLaeuft, setNameLaeuft] = useState(false);

  const allItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  /** Die Einträge, an denen Anschlussfragen hängen. */
  const basisEntries = useMemo(() => {
    const entries = (answers.L01?.value as { entries?: { entryId: string; text: string }[] })
      ?.entries;
    return (entries ?? []).filter((entry) => entry.text.trim() !== "");
  }, [answers]);

  /**
   * Die Messung für den Pretest - und sie darf das Ausfüllen nicht stören.
   *
   * ---------------------------------------------------------------------------
   * SIE FEHLTE FÜR GENAU DIE BÖGEN, DIE VORGELEGT WERDEN
   * ---------------------------------------------------------------------------
   *
   * Aufgezeichnet wurde bisher nur v2.1. Die fachliche Durchsicht verlangt für
   * den Pilot Ausfülldauer, Auslassungsgründe und Abbruchstellen - „das darf
   * nicht durch bloßes Bauchgefühl entschieden werden“ steht dort wörtlich.
   * Ohne diese Zeilen hätte die Auswertung nach dem Pilot null Zeilen
   * geliefert, und gemerkt hätte man es erst danach.
   *
   * Kein await im Klickpfad, kein Blockieren, keine Fehlermeldung: Eine
   * Messung, die den gemessenen Vorgang behindert, misst am Ende sich selbst.
   */
  const gesehen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const frisch = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute("data-item-id"))
          .filter(
            (itemId): itemId is string => Boolean(itemId) && !gesehen.current.has(itemId!),
          );
        if (frisch.length === 0) return;
        for (const itemId of frisch) gesehen.current.add(itemId);
        void noteItemSeen(frisch, scope, ventureId ?? undefined).catch(() => {});
      },
      // Halb sichtbar reicht: Wer eine Frage nur beim Scrollen streift, hat sie
      // nicht gelesen - wer sie zur Haelfte vor sich hat, schon.
      { threshold: 0.5 },
    );

    for (const node of document.querySelectorAll("[data-item-id]")) observer.observe(node);
    return () => observer.disconnect();
  }, [scope, ventureId, sections]);

  /**
   * Wie lange gewartet wird, bevor gespeichert wird.
   *
   * ---------------------------------------------------------------------------
   * BEIM TIPPEN LÄNGER
   * ---------------------------------------------------------------------------
   *
   * GEMELDET AM 30.09.2026: „Bei ,Was sollte dieses Vorhaben erreichen'
   * speichert es immer nach einem Buchstaben, das ist etwas lästig."
   *
   * Sechshundert Millisekunden reichen beim Ankreuzen und sind beim Schreiben
   * zu kurz: Wer einen Satz formuliert, macht laufend längere Pausen als das —
   * und sieht dann bei jedem Nachdenken „Speichern …". Beim Tippen wird
   * deshalb gewartet, bis jemand wirklich fertig ist; und wer das Feld
   * verlässt, hat es ohnehin.
   */
  const TIPPEN = new Set([
    "structured_text",
    "free_text",
    "free_text_repeatable",
    "free_text_per_entry",
    "number_range",
    "person_number_range",
    "money_range",
    "time_windows",
    "date",
  ]);
  const wartezeit = (itemId: string) =>
    TIPPEN.has(answerable[itemId]?.answerFormat ?? "") ? 2000 : 600;

  const persist = useCallback(
    (itemId: string, draft: DraftV21, sofort = false) => {
      clearTimeout(timers.current[itemId]);

      const stand =
        draft.missingCode !== undefined
          ? "complete"
          : completenessV21(itemId, draft.value, answerable[itemId]);

      if (stand === "incomplete") {
        setStates((current) => ({ ...current, [itemId]: "incomplete" }));
        return;
      }

      timers.current[itemId] = setTimeout(async () => {
        setStates((current) => ({ ...current, [itemId]: "saving" }));
        try {
          const result =
            stand === "empty"
              ? await clearAnswer(scope, itemId, ventureId ?? undefined)
              : await saveAnswer(
                  scope,
                  {
                    blockId: itemId,
                    ...(draft.missingCode
                      ? { missingCode: draft.missingCode }
                      : { value: draft.value }),
                  } as AlignmentAnswerV21,
                  ventureId ?? undefined,
                );

          setStates((current) => ({ ...current, [itemId]: result.ok ? "saved" : "error" }));
          setErrors((current) => ({ ...current, [itemId]: result.ok ? "" : result.reason }));
          if (result.ok && stand === "complete") {
            void noteItemAnswered(itemId, scope, ventureId ?? undefined).catch(() => {});
          }
        } catch {
          // Wirft die Serveraktion, blieb die Anzeige sonst fuer immer auf
          // "wird gespeichert". Das sieht aus wie Speichern und ist keines.
          setStates((current) => ({ ...current, [itemId]: "error" }));
          setErrors((current) => ({ ...current, [itemId]: "unreachable" }));
        }
      }, sofort ? 0 : wartezeit(itemId));
    },
    [scope, ventureId, answerable],
  );

  /**
   * Was noch im Warten steht, jetzt speichern.
   *
   * Wer ein Feld verlässt, ist damit fertig — darauf noch zwei Sekunden zu
   * warten, hiesse zweimal dasselbe zu wissen. Und wer in derselben Sekunde
   * abgibt, hätte sonst einen ungespeicherten Stand.
   */
  const jetztSpeichern = (itemId: string) => {
    if (!timers.current[itemId]) return;
    const draft = answers[itemId];
    if (draft) persist(itemId, draft, true);
  };

  /**
   * Was am Ende dasteht.
   *
   * ---------------------------------------------------------------------------
   * DER KNOPF HIESS IN BEIDEN BOEGEN „FOUNDER-PROFIL ERSTELLEN"
   * ---------------------------------------------------------------------------
   *
   * Im zweiten Teil erstellt man aber kein Profil, sondern beschreibt ein
   * Vorhaben — das UX-Review sagt es wörtlich: „Nicht: Founder-Profil
   * erstellen". Die Beschriftung stand hier im Bauteil und galt damit für
   * alles, was das Bauteil anzeigt. Jetzt steht sie im Review, wird von dort
   * erzeugt, und `screens.ts` weist einen Bogen ab, dessen Knopf wieder so
   * heißt.
   */
  const abschluss = screens.closing;

  /**
   * Der Abgabeknopf - einmal geschrieben, von beiden Wegen benutzt.
   *
   * Er steht hinter der letzten Frage und nicht über der ersten: Abgeben ist
   * das Letzte, was man tut.
   */
  function abgabeKnopf() {
    return (
      <div>
  <button
              type="button"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={async () => {
                if (nichtGespeichert().length > 0) {
                  setSubmitError("unsaved");
                  return;
                }
                setSubmitting(true);
                setSubmitError("");
                try {
                  const result = await submitScope(scope, ventureId ?? undefined);
                  if (result.ok) {
                    setIsSubmitted(true);
                    setMissingAfterSubmit([]);
                    // NICHT STEHENBLEIBEN. Der Knopf schliesst den laengsten
                    // Teil ab - danach gehoert man woandershin, und zwar
                    // dorthin, wo das Ergebnis steht.
                    if (afterSubmit) router.push(afterSubmit);
                  } else {
                    setMissingAfterSubmit(result.missing ?? []);
                    // Fehlende Antworten stehen an den Fragen selbst. Alles
                    // andere - ein abgewiesener Schreibversuch, ein Lesefehler -
                    // stand vorher NIRGENDS: Der Knopf sprang zurueck, und es
                    // sah aus, als haette man nichts getan.
                    if (result.reason !== "incomplete") setSubmitError(result.reason);
                  }
                } catch {
                  // OHNE DAS BLIEB DER KNOPF FUER IMMER AUF "wird abgegeben".
                  // Gemeldet am 30.09.2026. Beim Speichern war es schon
                  // abgefangen, beim Abgeben nicht - und da faellt es am
                  // meisten auf, weil man danach wartet.
                  setSubmitError("unreachable");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? abschluss.ctaBusy : abschluss.cta}
            </button>
            {abschluss.subline && (
              <p className="mt-2 text-sm text-slate-600">{abschluss.subline}</p>
            )}
  
            {submitError && (
              <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {submitErrorText(submitError)}
              </p>
            )}
      </div>
    );
  }

  /**
   * Eine Frage mit ihrem Feld und ihrem Zustand.
   *
   * Als Funktion, weil sie von zwei Wegen gebraucht wird: von den sieben
   * Bildschirmen des Arbeitsprofils und von der Abschnittsliste des
   * Venture-Alignments. Zwei Kopien liefen nach dem ersten Unterschied
   * auseinander - und zwar lautlos, weil beide richtig aussehen.
   */
  const frageInhalt = (item: SectionView["items"][number], klein = false) => {
    const draft = answers[item.itemId] ?? {};
    const state = states[item.itemId] ?? "idle";
    return (
      <>
        <p className={klein ? "text-sm text-slate-900" : "text-base text-slate-900"}>
          {item.prompt}
        </p>
        {item.hint && <p className="mt-1 text-sm text-slate-500">{item.hint}</p>}

        <div className={klein ? "mt-2" : "mt-4"}>
          <AnswerFieldV21
            item={item}
            draft={draft}
            basisEntries={basisEntries}
            disabled={isSubmitted}
            onChange={(next) => {
              setAnswers((current) => ({ ...current, [item.itemId]: next }));
              persist(item.itemId, next);
            }}
          />
        </div>

        {wartendeAnschlussfragen(item.itemId) > 0 && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Wenn du hier etwas einträgst, kommen{" "}
            {wartendeAnschlussfragen(item.itemId) === 1
              ? "eine Anschlussfrage"
              : `${wartendeAnschlussfragen(item.itemId)} Anschlussfragen`}{" "}
            dazu. Ohne Eintrag gibt es dazu nichts zu fragen.
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs">
          {state === "saving" && <span className="text-slate-500">Speichern …</span>}
          {state === "saved" && <span className="text-slate-500">Gespeichert</span>}
          {state === "incomplete" && (
            <span className="text-slate-400">noch nicht vollständig</span>
          )}
          {state === "error" && (
            <span className="text-rose-700">
              {errorText(errors[item.itemId])}{" "}
              {/* WIEDERHOLEN NUR, WO WIEDERHOLEN HELFEN KANN. Ein Knopf, der
                  nie Erfolg haben kann, laesst jemanden zehnmal klicken und
                  dann glauben, er habe etwas falsch gemacht. */}
              {kannWiederholen(errors[item.itemId]) && (
                <button
                  type="button"
                  className="underline"
                  onClick={() => persist(item.itemId, answers[item.itemId] ?? {})}
                >
                  Erneut versuchen
                </button>
              )}
            </span>
          )}
        </div>
      </>
    );
  };

  /** Eine Frage in ihrer eigenen Karte. */
  const frageKarte = (item: SectionView["items"][number]) => (
    <div
      key={item.itemId}
      data-item-id={item.itemId}
      // WER DAS FELD VERLAESST, IST FERTIG. React laesst `blur` steigen,
      // deshalb steht es an der Karte und nicht an jedem Feld darin.
      onBlur={() => jetztSpeichern(item.itemId)}
      className={[
        "rounded-xl border p-5",
        missingAfterSubmit.includes(item.itemId)
          ? "border-amber-300 bg-amber-50/40"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      {frageInhalt(item)}
    </div>
  );

  /**
   * Mehrere Fragen mit derselben Frage darüber — in EINER Karte.
   *
   * ---------------------------------------------------------------------------
   * EIN BLOCK UND NICHT SECHS KARTEN
   * ---------------------------------------------------------------------------
   *
   * Das UX-Review Teil 2 zu den sechs Zielen: „Als gemeinsamer Block
   * darstellen, nicht als sechs große unabhängige Fragekarten." Sechs Kästen
   * mit Rahmen und Abstand sehen aus wie sechs Fragen; es ist eine Frage über
   * sechs Zeilen, und wer sie vergleichen soll, muss sie nebeneinander sehen.
   *
   * Teil 1 sagt dasselbe für seine Skalenblöcke („Items mit gleicher Skala in
   * einer gemeinsamen Abschnittskarte").
   */
  const gruppenKarte = (
    gruppenfrage: string,
    reihe: SectionView["items"][number][],
  ) => (
    <div
      key={`gruppe-${reihe[0].itemId}`}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <p className="border-b border-slate-200 pb-3 text-base font-medium text-slate-900">
        {gruppenfrage}
      </p>
      <div className="divide-y divide-slate-100">
        {reihe.map((item) => (
          <div
            key={item.itemId}
            data-item-id={item.itemId}
            onBlur={() => jetztSpeichern(item.itemId)}
            className={[
              "-mx-2 px-2 py-4",
              missingAfterSubmit.includes(item.itemId) ? "bg-amber-50/60" : "",
            ].join(" ")}
          >
            {frageInhalt(item, true)}
          </div>
        ))}
      </div>
    </div>
  );

  const sichtbar = (item: SectionView["items"][number]) =>
    !item.basisItemId || basisEntries.length > 0;

  /**
   * Wie viele Anschlussfragen an dieser Frage hängen — und noch nicht da sind.
   *
   * ---------------------------------------------------------------------------
   * EIN LEERER PLATZ ERKLÄRT SICH NICHT VON SELBST
   * ---------------------------------------------------------------------------
   *
   * Gemeldet am 30.09.2026: „In der aktuellen gerenderten Fassung endet der
   * Bereich nach L01." Das stimmt — und ist so gewollt: L02 fragt zu jeder
   * einzelnen Grenze, und ohne Grenze gibt es nichts zu fragen.
   *
   * Nur weiß das niemand, der davorsitzt. Wer L01 leer lässt, sieht einen
   * Abschnitt mit einer Frage und hält ihn für vollständig. Ein Satz dazu
   * kostet nichts und nimmt den Verdacht, hier fehle etwas.
   */
  const wartendeAnschlussfragen = (itemId: string) =>
    basisEntries.length > 0
      ? 0
      : allItems.filter((item) => item.basisItemId === itemId).length;

  // ---------------------------------------------------------------------------
  // DIE EINLEITUNG
  // ---------------------------------------------------------------------------
  if (step === 0) {
    // Gefragt wird nur, wenn noch keiner dasteht. Wer sein Vorhaben schon
    // benannt hat, soll nicht bei jedem Durchgang wieder danach gefragt
    // werden - umbenennen geht im Kopf der Seite.
    const namensfrage =
      screens.nameQuestion && !ventureName && ventureId ? screens.nameQuestion : null;

    const weiter = () => {
      if (!namensfrage || !name.trim() || !ventureId) {
        zuSchritt(1);
        return;
      }
      // OHNE NAMEN GEHT ES AUCH WEITER. Er ist eine Beschriftung und keine
      // Bedingung: Ein fehlgeschlagener Schreibversuch darf niemanden vor
      // dem Fragebogen stehen lassen, den er ausfuellen wollte.
      setNameLaeuft(true);
      void setVentureName(ventureId, name)
        .catch(() => {})
        .finally(() => {
          setNameLaeuft(false);
          zuSchritt(1);
        });
    };

    return (
      <div className="max-w-2xl space-y-5">
        <h1 className="text-2xl font-semibold text-slate-900">{screens.intro.title}</h1>
        {screens.intro.paragraphs.map((absatz) => (
          <p key={absatz} className="text-base leading-7 text-slate-700">
            {absatz}
          </p>
        ))}
        {/* KEINE ZEITANGABE. Das UX-Review: erst im Pretest messen. Eine
            geratene Zahl waere ein Versprechen, das niemand geprueft hat. */}

        {namensfrage && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-base font-medium text-slate-900">
              {namensfrage.title}
              {namensfrage.subline && (
                <span className="mt-1 block text-sm font-normal text-slate-600">
                  {namensfrage.subline}
                </span>
              )}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={namensfrage.placeholder ?? undefined}
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={nameLaeuft}
            onClick={weiter}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {namensfrage ? namensfrage.cta : screens.intro.cta}
          </button>
          {/* „Später" ist kein zweiter Weg, sondern derselbe ohne Namen -
              deshalb ein Link und kein Knopf. */}
          {namensfrage && (
            <button
              type="button"
              onClick={() => zuSchritt(1)}
              className="text-sm text-slate-600 underline"
            >
              {namensfrage.skip}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DIE SCHRITTE
  // ---------------------------------------------------------------------------
  const schirm = screens.screens.find((entry) => entry.step === step) ?? screens.screens[0];
  const letzter = schirm.step === screens.screens.length;
  const fragen = schirm.items
    .map((itemId) => allItems.find((item) => item.itemId === itemId))
    .filter((item): item is SectionView["items"][number] => item !== undefined)
    .filter(sichtbar);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        {/* "Schritt 3 von 7" und nicht "7 von 16 Fragen" - das eine liest
            sich wie ein Weg, das andere wie eine Pruefung.

            DAZU, WORUM ES GERADE GEHT. Gemeldet am 30.09.2026: "ich weiss
            nicht, wo ich bin". Eine Schrittzahl allein sagt, wie weit man
            ist, aber nicht, woran man sitzt. Klein und in einer Zeile mit dem
            Zaehler - eine zweite Ueberschrift ueber dem Uebergang waere ein
            zweiter Anfang. */}
        <p className="text-sm text-slate-500">
          Schritt {schirm.step} von {screens.screens.length}
          <span className="text-slate-400"> · </span>
          <span className="text-slate-600">{schirm.title}</span>
        </p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-200">
          <div
            className="h-1 rounded-full bg-slate-900 transition-all"
            style={{ width: `${(schirm.step / screens.screens.length) * 100}%` }}
          />
        </div>
      </div>

      {schirm.transition && (
        <p className="text-lg font-medium text-slate-900">{schirm.transition}</p>
      )}
      {schirm.subline && <p className="text-base text-slate-600">{schirm.subline}</p>}

      {schirm.groupPrompt && (
        <p className="text-base font-medium text-slate-900">{schirm.groupPrompt}</p>
      )}

      <div className="space-y-5">
        {questionBlocks(fragen).map((block) =>
          block.groupPrompt && block.items.length > 1
            ? gruppenKarte(block.groupPrompt, block.items)
            : block.items.map(frageKarte),
        )}
      </div>

      {missingAfterSubmit.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Es fehlen noch {missingAfterSubmit.length} Antworten. Für jede Frage gibt es
          auch eine Antwort, die das Nichtbeantworten benennt — du musst nichts
          hinschreiben, was du nicht meinst.
        </p>
      )}

      {/* DER MOMENT VOR DEM ABSENDEN. Vorher stand hier nur ein Knopf;
          jetzt steht davor, was er tut - und dass man vorher noch einmal
          schauen darf. */}
      {letzter && !isSubmitted && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-semibold text-slate-950">{abschluss.title}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{abschluss.text}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        {schirm.step > 1 && (
          <button
            type="button"
            onClick={() => zuSchritt(schirm.step - 1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Zurück
          </button>
        )}
        {!letzter && (
          <button
            type="button"
            onClick={() => zuSchritt(schirm.step + 1)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Weiter
          </button>
        )}
        {letzter && !isSubmitted && abgabeKnopf()}
      </div>

      {letzter && isSubmitted && (
        <p className="text-sm font-medium text-slate-900">
          Abgegeben. Deine Antworten stehen{" "}
          {scope === "founder_profile" ? "in deinem Founder-Profil" : "bei diesem Vorhaben"}.
        </p>
      )}
    </div>
  );
}

/**
 * `option_needs_text` ist für uns eine brauchbare Auskunft und für die Person
 * davor keine. Die Kennung bleibt in der Antwort der Serverfunktion.
 */
/**
 * Was bei einer gescheiterten Abgabe dastehen soll.
 *
 * Getrennt von `errorText`, weil es andere Fehler sind: Dort geht es um eine
 * einzelne Antwort, hier um den ganzen Durchgang. Und in beiden Fällen gilt
 * derselbe Satz - die Antworten sind noch da.
 */
/**
 * Hilft ein zweiter Versuch?
 *
 * Nur bei Fehlern, die vorbeigehen können: eine unterbrochene Verbindung, ein
 * Schreibversuch, der gerade abgewiesen wurde. Eine fehlende Fassung in der
 * Datenbank und eine fehlende Rolle gehen nicht von selbst vorbei — dort wäre
 * der Knopf eine Lüge.
 */
function kannWiederholen(reason?: string): boolean {
  // NUR DIE UNTERBROCHENE LEITUNG. Vorher stand der Knopf bei allem ausser
  // zwei Faellen - auch bei einer Antwort, die die Pruefung ablehnt. Dort
  // kann ein zweiter Versuch nie Erfolg haben: Es wuerde dieselbe Antwort
  // noch einmal geschickt und dieselbe Ablehnung kommen. Wer zehnmal klickt
  // und dann glaubt, er habe etwas falsch gemacht, hat recht - nur war es
  // nicht das Klicken.
  return reason === "unreachable";
}

function submitErrorText(reason: string): string {
  switch (reason) {
    case "unsaved":
      return "Eine Antwort ist noch nicht gespeichert. Bitte warte kurz oder versuche sie erneut zu speichern.";
    case "unreachable":
      return "Das hat gerade nicht geklappt. Deine Antworten sind noch da. Bitte versuche es erneut.";
    case "no_permission":
      return "Dieser Fragebogen ist für dein Konto nicht freigeschaltet. Deine Antworten sind noch da.";
    case "setup_missing":
      return "Diese Umgebung kennt den Fragebogen noch nicht — die Datenbank ist nicht auf dem Stand der Anwendung. Deine Antworten sind noch da; bitte sag uns Bescheid.";
    case "venture_ambiguous":
      return "Du bist in mehreren Vorhaben — bitte wähle oben eins aus.";
    default:
      return `Das hat gerade nicht geklappt (${reason}). Deine Antworten sind noch da — sag uns bitte Bescheid.`;
  }
}

function errorText(reason = "unbekannt"): string {
  switch (reason) {
    case "option_needs_text":
      return "Bitte beschreibe kurz, was du meinst.";
    case "exclusive_option_with_others":
      return "Diese Antwort schließt die anderen aus.";
    case "too_many_options":
      return "Bitte höchstens zwei auswählen.";
    case "missing_currency":
      return "Bitte wähle eine Währung.";
    case "missing_unit":
      return "Bitte gib eine Einheit an.";
    case "incomplete_window":
      return "Bitte Tag, Uhrzeit und Zeitzone angeben.";
    case "person_without_name":
      return "Bitte benenne die Person oder die geplante Rolle.";
    case "empty_text":
      return "Da steht noch nichts.";
    case "incomplete_value_case":
      return "Bitte beide Anliegen bewerten und einen Weg wählen.";
    case "venture_ambiguous":
      return "Du bist in mehreren Vorhaben — bitte wähle oben eins aus.";
    case "unreachable":
      return "Verbindung unterbrochen — diese Änderung ist noch nicht gespeichert.";
    case "no_permission":
      return "Dieser Fragebogen ist für dein Konto nicht freigeschaltet.";
    case "setup_missing":
      return "Diese Umgebung kennt den Fragebogen noch nicht — die Datenbank ist nicht auf dem Stand der Anwendung. Ein zweiter Versuch hilft hier nicht.";
    case "value_rejected":
      return "Diese Antwort hat die Datenbank abgelehnt. Das ist ein Fehler bei uns — bitte sag uns, bei welcher Frage es passiert ist.";
    case "draft_create_failed":
      return "Der Fragebogen konnte nicht angelegt werden. Das liegt an uns, nicht an dir — bitte sag uns Bescheid.";

    // ---------------------------------------------------------------------------
    // JEDER FEHLSCHLAG OHNE NAMEN SAH GLEICH AUS
    // ---------------------------------------------------------------------------
    //
    // GEMELDET AM 30.09.2026: "Es kommt eine Meldung, dass es nicht
    // gespeichert werden kann, und erneut versuchen." Genau diese Meldung -
    // und sie sagte weder ihr noch mir, WAS schiefging. Von den
    // fuenfunddreissig Gruenden, die die Antwortpruefung kennt, hatten zwoelf
    // einen Satz; die uebrigen dreiundzwanzig sahen alle so aus.
    //
    // Deshalb steht der Grund jetzt dabei. Nicht schoen, aber in einer
    // Testfassung ist eine Kennung, die man weitersagen kann, mehr wert als
    // ein glatter Satz, der nichts sagt. Und der Satz sagt dazu, dass es an
    // uns liegt und nicht an der Person.
    default:
      return `Das konnte nicht gespeichert werden (${reason}). Das liegt an uns, nicht an dir — sag uns bitte, bei welcher Frage es passiert ist.`;
  }
}
