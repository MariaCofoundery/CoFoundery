import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PRODUCT_NAME } from "@/features/brand";

/**
 * Das Blog ist oeffentlich und gehoert nicht zur Produkt-Oberflaeche: Es steht bewusst NICHT in isProductChromePath, also zeigt die App hier
 * weder Menue noch Konto. Kein Tracking, keine Cookies, keine Skripte von Dritten.
 */
export const metadata: Metadata = {
  alternates: { types: { "application/rss+xml": "/blog/feed.xml" } },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label={PRODUCT_NAME}><BrandLogo className="h-9" priority sizes="144px" /></Link>
          <Link href="/blog" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-800 hover:underline">Blog</Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
