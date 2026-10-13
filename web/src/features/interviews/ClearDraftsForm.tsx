"use client";

import type { ReactNode } from "react";
import { clearAllInterviewDrafts } from "@/features/interviews/interviewDrafts";

/**
 * Ein Abmelde-Formular, das vorher die Interview-Puffer dieses Browsers
 * leert. Nur beim ausdruecklichen Abmelden - eine abgelaufene Sitzung soll den
 * ungespeicherten Text gerade NICHT verlieren.
 */
export function ClearDraftsForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={action} className={className} onSubmit={() => clearAllInterviewDrafts()}>
      {children}
    </form>
  );
}
