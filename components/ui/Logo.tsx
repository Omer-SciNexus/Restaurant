import { BRAND } from "@/lib/domain";

/** Working logo from the brand kit: a leaf mark plus the Fraunces wordmark. Final SVGs replace it at Gate 1. */
export function LeafMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M27 5C15 5 6 11 6 20c0 2.2.7 4.2 1.8 5.9C10 21 14.700 16.600 21 13.500 15.800 17 11.800 21.600 9.700 27.300 11.300 28.400 13.200 29 15.200 29 24 29 27.700 18 27 5Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-forest ${className}`}>
      <LeafMark />
      <span className="font-heading text-xl font-medium tracking-tight">{BRAND.name}</span>
    </span>
  );
}
