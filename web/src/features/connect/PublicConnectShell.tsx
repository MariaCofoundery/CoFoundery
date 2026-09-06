import Link from "next/link";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";

export function PublicConnectShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" aria-label="CoFoundery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cofoundery-align-logo.svg" alt="CoFoundery Align" width={200} height={70} className="h-9 w-auto" />
        </Link>
        <PublicLanguageSwitcher />
      </div>
    </header>
    {children}
  </div>;
}

export function PublicConnectAvatar({ src, displayName, className = "h-16 w-16" }: { src: string | null; displayName: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`${className} rounded-full object-cover`} />;
  }
  return <span aria-hidden className={`${className} flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700`}>
    {(displayName.trim()[0] || "N").toUpperCase()}
  </span>;
}
