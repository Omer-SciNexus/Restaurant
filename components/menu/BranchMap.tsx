"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };
type MapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => { fitBounds: (bounds: unknown) => void };
  LatLngBounds: new () => { extend: (point: LatLng) => void };
  Marker: new (options: { position: LatLng; map: unknown; title: string }) => { addListener: (event: string, handler: () => void) => void };
};

/** Shows only with a Google Maps key. The list on the page is the same information without one. */
export function BranchMap({ branches }: { branches: { slug: string; name: string; lat: number; lng: number }[] }) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!apiKey) return;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => {
      const maps = (window as unknown as { google?: { maps: MapsApi } }).google?.maps;
      if (!maps || !container.current) return;
      const map = new maps.Map(container.current, { mapTypeControl: false, streetViewControl: false });
      const bounds = new maps.LatLngBounds();
      for (const branch of branches) {
        const position = { lat: branch.lat, lng: branch.lng };
        new maps.Marker({ position, map, title: branch.name }).addListener("click", () => router.push(`/branches/${branch.slug}`));
        bounds.extend(position);
      }
      map.fitBounds(bounds);
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, [apiKey, branches, router]);

  if (!apiKey) return null;
  return <div ref={container} role="region" aria-label="Map of our branches. The same branches are listed below." className="mt-6 h-80 overflow-hidden rounded-brand bg-oat-deep" />;
}
