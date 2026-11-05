"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

/**
 * Ziehen und Ablegen im Kalender (Aufgaben, Social Media): ein Eintrag wird auf einen anderen Tag gezogen,
 * die Seite ruft die passende Server-Aktion und laedt neu. Mit der Maus und auf Tablets; auf dem
 * Telefon gibt es dafuer das Feld "Tag" im Eintrag - Ziehen auf kleinem Bildschirm ist eher Zufall.
 */

const MIME = "application/x-cofoundery-calendar-item";

export function DraggableItem({ id, kind, children, className }: { id: string; kind: string; children: ReactNode; className?: string }) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(MIME, JSON.stringify({ id, kind }));
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`${className ?? ""} cursor-grab active:cursor-grabbing`}
    >
      {children}
    </div>
  );
}

export function DropDay({
  day,
  kind,
  move,
  label,
  children,
  className,
}: {
  day: string;
  kind: string;
  /** Server-Aktion: Eintrag `id` auf `day` legen. */
  move: (id: string, day: string) => Promise<{ ok: boolean }>;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div
      aria-label={label}
      aria-busy={pending || undefined}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const raw = event.dataTransfer.getData(MIME);
        if (!raw) return;
        event.preventDefault();
        let item: { id?: unknown; kind?: unknown } = {};
        try {
          item = JSON.parse(raw);
        } catch {
          return;
        }
        if (item.kind !== kind || typeof item.id !== "string") return;
        const id = item.id;
        startTransition(async () => {
          const result = await move(id, day);
          if (result.ok) router.refresh();
        });
      }}
      className={`${className ?? ""} ${over ? "bg-violet-50 ring-2 ring-inset ring-violet-400" : ""} ${pending ? "opacity-60" : ""}`}
    >
      {children}
    </div>
  );
}
