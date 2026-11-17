import { blogButtonHref, blogCopy, type BlogBlock, type BlogLanguage } from "@/features/blog/blogModel";
import { parseInline, parseRich, type Inline } from "@/features/blog/blogMarkup";
import { blogImageUrl } from "@/features/blog/blogData";
import { subscribePublicNewsletterAction } from "@/features/newsletter/publicNewsletterActions";

/**
 * Der Inhalt eines Beitrags - gebaut aus Daten (React-Elemente), nie aus HTML-Text. Links nur auf https oder auf diese App.
 */
function InlineView({ items }: { items: Inline[] }) {
  return <>{items.map((item, index) => {
    if (item.kind === "strong") return <strong key={index}>{item.text}</strong>;
    if (item.kind === "em") return <em key={index}>{item.text}</em>;
    if (item.kind === "link") return <a key={index} href={item.href} rel="noopener noreferrer" className="text-[#4a2fb8] underline underline-offset-2 hover:text-[#2f1b86]">{item.text}</a>;
    return <span key={index}>{item.text}</span>;
  })}</>;
}

const HEADING = {
  2: "mt-10 mb-3 font-sans text-2xl font-bold leading-snug tracking-tight text-slate-950",
  3: "mt-8 mb-2 font-sans text-xl font-bold leading-snug text-slate-950",
  4: "mt-6 mb-2 font-sans text-lg font-bold leading-snug text-slate-950",
} as const;

export function BlogBody({ blocks, appOrigin, language = "de", returnTo = "/blog", newsletterStatus = null }: { blocks: BlogBlock[]; appOrigin: string; language?: BlogLanguage; returnTo?: string; newsletterStatus?: string | null }) {
  const copy = blogCopy(language);
  return (
    <div className="text-[19px] leading-[1.75] text-slate-800">
      {blocks.map((block) => {
        if (block.type === "text") {
          return <div key={block.id}>{parseRich(block.text).map((part, index) => {
            if (part.kind === "heading") {
              const Tag = `h${part.level}` as "h2" | "h3" | "h4";
              return <Tag key={index} className={HEADING[part.level]}><InlineView items={part.inline} /></Tag>;
            }
            if (part.kind === "list") return <ul key={index} className="my-4 list-disc space-y-1.5 pl-6">{part.items.map((item, i) => <li key={i}><InlineView items={item} /></li>)}</ul>;
            return <p key={index} className="my-4"><InlineView items={part.inline} /></p>;
          })}</div>;
        }
        if (block.type === "quote") {
          return (
            <figure key={block.id} className="my-8 border-l-4 border-[#6d49e0] bg-[#f6f4fd] px-5 py-4">
              <blockquote className="text-xl leading-relaxed text-slate-900"><InlineView items={parseInline(block.text)} /></blockquote>
              {block.by ? <figcaption className="mt-2 font-sans text-sm text-slate-600">{block.by}</figcaption> : null}
            </figure>
          );
        }
        if (block.type === "image") {
          if (!block.path || !block.alt.trim()) return null;
          return (
            <figure key={block.id} className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={blogImageUrl(block.path)} alt={block.alt} loading="lazy" decoding="async" className="h-auto max-w-full rounded-2xl" />
            </figure>
          );
        }
        if (block.type === "newsletter") {
          // Anmeldung nur mit E-Mail, ohne Konto (eigene Liste, Double-Opt-in). Der Blog setzt weder Cookies noch Skripte; das Formular schickt
          // nur die Adresse (und ein verstecktes Feld gegen Programme) an eine Server-Aktion.
          const status = newsletterStatus && newsletterStatus in copy.newsletterStatus ? (newsletterStatus as keyof typeof copy.newsletterStatus) : null;
          return (
            <aside key={block.id} id="newsletter" aria-labelledby={`nl-${block.id}`} className="my-10 rounded-2xl border border-[#cfc6f6] bg-[linear-gradient(120deg,#f4f0ff,#eaf6fb)] p-6 font-sans">
              <h2 id={`nl-${block.id}`} className="text-xl font-bold text-slate-950">{copy.newsletterTitle}</h2>
              <p className="mt-2 text-base leading-7 text-slate-700">{copy.newsletterText}</p>
              {status ? <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${status === "sent" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{copy.newsletterStatus[status]}</p> : null}
              {status === "sent" ? null : (
                <form action={subscribePublicNewsletterAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="language" value={language} />
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label></div>
                  <label className="block flex-1 text-sm font-semibold text-slate-900">{copy.newsletterEmail}
                    <input type="email" name="email" required autoComplete="email" maxLength={254} className="mt-1 min-h-11 w-full rounded-xl border border-[#c9ccdf] bg-white px-3 text-base text-slate-950" />
                  </label>
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-6 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{copy.newsletterButton}</button>
                </form>
              )}
              <p className="mt-3 text-[13px] leading-5 text-slate-600">{copy.newsletterNote} <a href="/datenschutz" className="underline">{copy.newsletterPrivacy}</a>.</p>
            </aside>
          );
        }
        const href = blogButtonHref(block.href, appOrigin);
        if (!href || !block.label.trim()) return null;
        return (
          <p key={block.id} className="my-10">
            <a href={href} className="inline-flex min-h-12 items-center rounded-full bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-7 font-sans text-base font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{block.label}</a>
          </p>
        );
      })}
    </div>
  );
}
