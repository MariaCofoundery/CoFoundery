import { blogButtonHref, blogCopy, type BlogBlock, type BlogLanguage } from "@/features/blog/blogModel";
import { parseInline, parseRich, type Inline } from "@/features/blog/blogMarkup";
import { blogImageUrl } from "@/features/blog/blogData";

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

export function BlogBody({ blocks, appOrigin, language = "de" }: { blocks: BlogBlock[]; appOrigin: string; language?: BlogLanguage }) {
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
          // Ein Hinweis, kein Formular: Der Blog erhebt nichts und kennt keine Konten. Die Anmeldung laeuft in der App (Double-Opt-in).
          return (
            <aside key={block.id} aria-labelledby={`nl-${block.id}`} className="my-10 rounded-2xl border border-[#cfc6f6] bg-[linear-gradient(120deg,#f4f0ff,#eaf6fb)] p-6 font-sans">
              <h2 id={`nl-${block.id}`} className="text-xl font-bold text-slate-950">{copy.newsletterTitle}</h2>
              <p className="mt-2 text-base leading-7 text-slate-700">{copy.newsletterText}</p>
              <p className="mt-4"><a href="/account" className="inline-flex min-h-11 items-center rounded-full border border-[#6d49e0] bg-white px-6 text-base font-semibold text-[#4a2fb8] hover:bg-[#f4f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{copy.newsletterButton}</a></p>
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
