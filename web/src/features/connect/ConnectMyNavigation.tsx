"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
export function ConnectMyNavigation() {
  const path = usePathname(); const t = useTranslations("connect"); const w = useTranslations("problemWorkspace");
  const links = [["/connect/profile", t("actions.profile")], ["/connect/my", t("my.title")], ["/connect/ventures/mine", t("beta.ownVentures")], ["/connect/workspaces", w("title")], ["/connect/searches", t("searches.title")]];
  if (!links.some(([href]) => path === href || path.startsWith(href + "/"))) return null;
  return <nav aria-label={t("beta.mine")} className="mx-auto flex max-w-5xl flex-wrap gap-2 px-5 pt-5">{links.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm ${path === href ? "brand-here font-semibold" : "bg-white text-slate-600"}`}>{label}</Link>)}</nav>;
}
