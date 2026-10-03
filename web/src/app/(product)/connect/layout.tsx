import { ConnectMyNavigation } from "@/features/connect/ConnectMyNavigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

// Public /connect/p, /connect/l and /connect/pr live in (public-connect),
// outside this member-only layout.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ConnectMemberLayout({ children }: { children: ReactNode }) {
  return <><ConnectMyNavigation />{children}</>;
}
