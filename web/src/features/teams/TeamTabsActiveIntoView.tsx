"use client";

import { useEffect } from "react";

/**
 * Am Handy scrollt die Reiterleiste waagerecht; der aktive Reiter ("Check-in", "Founder Setup")
 * liegt sonst oft ausserhalb des sichtbaren Bereichs. Bewegt nur die Leiste selbst, nie die Seite.
 */
export function TeamTabsActiveIntoView() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("nav.team-tabs");
    const active = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = Math.max(0, active.offsetLeft - nav.clientWidth / 2 + active.offsetWidth / 2);
  }, []);
  return null;
}
