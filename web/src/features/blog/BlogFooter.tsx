import Link from "next/link";
import { blogCopy, type BlogLanguage } from "@/features/blog/blogModel";

/** Fuss jeder oeffentlichen Blog-Seite: Impressum und Datenschutz sind immer da, in der Sprache der Seite. */
export function BlogFooter({ language }: { language: BlogLanguage }) {
  const copy = blogCopy(language);
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <nav aria-label="Footer" className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-1 px-5 py-6 font-sans text-sm text-slate-700">
        <Link href="/impressum" className="inline-flex min-h-11 items-center hover:underline">{copy.imprint}</Link>
        <Link href="/datenschutz" className="inline-flex min-h-11 items-center hover:underline">{copy.privacy}</Link>
        <a href="/blog/feed.xml" className="inline-flex min-h-11 items-center hover:underline">{copy.feed}</a>
        <Link href="/" className="inline-flex min-h-11 items-center hover:underline">{copy.home}</Link>
      </nav>
    </footer>
  );
}
