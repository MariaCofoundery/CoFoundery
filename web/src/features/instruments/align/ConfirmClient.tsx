"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmVentureAnswers,
  type ConfirmEntry,
} from "@/features/instruments/align/ConfirmVentureAnswers";
import { confirmVentureAnswers } from "@/features/instruments/align/ventureActions";

/** Der Knopf, der den Blick festhält - und danach zurück zum Vorhaben führt. */
export function ConfirmClient(props: {
  ventureId: string;
  ventureName: string | null;
  partnerLabel: string;
  answeredAt: string | null;
  ages: ConfirmEntry[];
  keeps: ConfirmEntry[];
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  return (
    <>
      <ConfirmVentureAnswers
        ventureName={props.ventureName}
        partnerLabel={props.partnerLabel}
        answeredAt={props.answeredAt}
        ages={props.ages}
        keeps={props.keeps}
        editHref={`/founder-alignment/vorhaben?venture=${encodeURIComponent(props.ventureId)}`}
        confirming={pending}
        onConfirm={() =>
          start(async () => {
            const result = await confirmVentureAnswers(props.ventureId);
            if (!result.ok) return setFailed(true);
            router.push("/founder-alignment/vorhaben");
          })
        }
      />
      {failed && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          Das konnte nicht festgehalten werden. Deine Antworten sind davon nicht
          betroffen — sie gelten weiter.
        </p>
      )}
    </>
  );
}
