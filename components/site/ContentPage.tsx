import Image from "next/image";
import type { ReactNode } from "react";

/** Top of a company page: heading and lead, with a photo beside them on wide screens. */
export function PageIntro({ title, lead, image, imageAlt = "" }: { title: string; lead: ReactNode; image?: string; imageAlt?: string }) {
  if (!image) {
    return (
      <header className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <h1 className="text-4xl leading-tight">{title}</h1>
        <div className="mt-3 text-lg text-stone">{lead}</div>
      </header>
    );
  }
  return (
    <header className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-10">
      <div className="relative order-1 aspect-[3/2] overflow-hidden rounded-brand bg-oat-deep lg:order-2">
        <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" quality={80} className="object-cover" />
      </div>
      <div className="order-2 lg:order-1">
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        <div className="mt-4 text-lg text-stone">{lead}</div>
      </div>
    </header>
  );
}

/** A titled block of body copy. */
export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  const headingId = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h2 id={headingId} className="text-2xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * A fact the plan does not establish yet. Always visible, always worded the same way, so a
 * reviewer can search the site for "To be confirmed" and find every one.
 */
export function ToConfirm({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-brand border border-honey bg-honey/15 p-3 text-sm" data-testid="to-confirm">
      <strong>To be confirmed:</strong> {children}
    </p>
  );
}

/** On every legal page until the lawyer's text replaces it (plan weeks 8 to 12). */
export function LegalDraftNotice() {
  return (
    <p className="mt-4 rounded-brand border-2 border-terracotta bg-paper p-4 text-sm" data-testid="legal-draft">
      <strong>Draft, pending legal review.</strong> A lawyer has not reviewed this page yet. It describes how the service is planned to work, and nothing here is final or binding.
    </p>
  );
}
