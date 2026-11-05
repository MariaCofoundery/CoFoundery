"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Escape schliesst ein Panel: fuehrt auf die Adresse ohne das Panel. */
export function EscapeCloses({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) router.push(href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);
  return null;
}
