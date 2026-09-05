"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { STORE_ANCHOR, type Permit, type StreetWork } from "@/lib/queries";

/**
 * The real basemap under the permit pins.
 *
 * Leaflet touches `window` at import time, so it is loaded inside the effect
 * rather than at module scope: this file is a client component, but Next still
 * renders it on the server first and a top-level import would break the build.
 *
 * Tiles come from OpenStreetMap directly. CARTO's Positron style was the first
 * choice and matched the palette better, but its CDN now stamps every keyless
 * tile with "API KEY REQUIRED" while still returning 200, so the map looked
 * correct to every check that was not a human eye. OSM is unambiguously
 * keyless, and the saturation that makes it the loudest thing on an otherwise
 * restrained page is taken back out in CSS below.
 */
export function PermitMapView({
  permits,
  streetWork = [],
  className,
}: {
  permits: Permit[];
  /**
   * Street work is the answer this card exists to give, so it is drawn over
   * the building permits rather than beside them: warm and larger, against
   * the grey filings that are only context.
   */
  streetWork?: StreetWork[];
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        center: [STORE_ANCHOR.lat, STORE_ANCHOR.lon],
        zoom: 16,
        // The map sits mid-page inside a card. Wheel zoom here would swallow
        // the scroll of anyone on their way past it, so panning and zooming
        // are deliberate acts: drag, the +/- control, or double click.
        scrollWheelZoom: false,
        attributionControl: true,
      });
      map.current = instance;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        // Required by the OSM tile usage policy, not decoration.
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);

      // Permits first, so the store marker is never buried under a dot.
      for (const p of permits) {
        L.circleMarker([p.lat, p.lon], {
          radius: 4,
          weight: 1,
          color: "#71717a",
          fillColor: "#a1a1aa",
          fillOpacity: 0.9,
        })
          .addTo(instance)
          .bindTooltip(
            p.distanceM === null
              ? p.title
              : `${p.title} · ${
                  p.distanceM >= 1000
                    ? `${(p.distanceM / 1000).toFixed(1)} km`
                    : `${Math.round(p.distanceM)} m`
                }`,
            { direction: "top" },
          );
      }

      for (const w of streetWork) {
        const near = w.decision === "ALERT";
        L.circleMarker([w.lat, w.lon], {
          radius: near ? 6 : 5,
          weight: 2,
          color: "#ffffff",
          fillColor: near ? "#b42318" : "#d0a08f",
          fillOpacity: 1,
        })
          .addTo(instance)
          .bindTooltip(
            [w.segment ?? w.title, w.distanceM === null ? null : `${Math.round(w.distanceM)} m`]
              .filter(Boolean)
              .join(" · "),
            { direction: "top" },
          );
      }

      L.circleMarker([STORE_ANCHOR.lat, STORE_ANCHOR.lon], {
        radius: 7,
        weight: 3,
        color: "#ffffff",
        fillColor: "#2f6a4f",
        fillOpacity: 1,
      })
        .addTo(instance)
        .bindTooltip("Your store", { direction: "top" });

      // Frame the cluster, not the outliers. A few filings sit far from the
      // store, and fitting the view to those zooms out until the ~70 permits
      // around it collapse into a single speck: the first version of this map
      // framed everything and landed on zoom 13, where the neighbourhood was
      // unreadable. So the view is fitted to the nearest 90% and the stragglers
      // are simply left off the edge, which is the same call the SVG plate this
      // replaces was already making.
      if (permits.length || streetWork.length) {
        const kx = Math.cos((STORE_ANCHOR.lat * Math.PI) / 180);
        const radius = (pt: { lat: number; lon: number }) =>
          Math.hypot((pt.lon - STORE_ANCHOR.lon) * kx, pt.lat - STORE_ANCHOR.lat);

        const sorted = [...permits].sort((a, b) => radius(a) - radius(b));
        const near = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.9)));

        // Every street-work marker is kept in frame even if it sits outside
        // the building-permit cluster: cropping the answer out of the map to
        // frame the context would defeat the card.
        const points: [number, number][] = [
          ...near.map((p) => [p.lat, p.lon] as [number, number]),
          ...streetWork.map((w) => [w.lat, w.lon] as [number, number]),
        ];

        const bounds = L.latLngBounds(points).extend([STORE_ANCHOR.lat, STORE_ANCHOR.lon]);
        instance.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
      }

      // Leaflet measures the frame once and lays the tile grid out against
      // that. Any later change to the container's size leaves the grid at the
      // old dimensions, so the map paints into part of the frame and the rest
      // stays blank. The card's width is settled by CSS after mount, and again
      // at every breakpoint, so the size is watched rather than measured once.
      const resize = new ResizeObserver(() => instance.invalidateSize());
      resize.observe(holder.current);
      cleanup = () => resize.disconnect();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      map.current?.remove();
      map.current = null;
    };
  }, [permits, streetWork]);

  return (
    <div
      ref={holder}
      // The filter is scoped to the tile pane so the store pin, the permit
      // dots and the attribution link keep their own colour. Written here
      // rather than in globals.css, which the home-screen session owns.
      className={`[&_.leaflet-tile-pane]:[filter:saturate(0.32)_contrast(1.04)_brightness(1.03)] ${className ?? ""}`}
      role="img"
      aria-label={`Map of ${permits.length} permits filed near the store`}
    />
  );
}
