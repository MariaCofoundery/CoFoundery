"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DelayedRedirectProps = {
  href: string;
  delayMs?: number;
};

export function DelayedRedirect({ href, delayMs = 5000 }: DelayedRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(href);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, href, router]);

  return null;
}
