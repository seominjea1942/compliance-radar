"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { STORE_ANCHOR, type Permit, type StreetWork } from "@/lib/queries";
import { STREET_COLORS } from "@/lib/street-colors";
import type { HoverTarget } from "@/components/street/MapHoverCard";

/**
 * The real basemap under the permit pins.
 *
 * Leaflet touches `window` at import time, so it is loaded inside the effect
 * rather than at module scope: this file is a client component, but Next still
 * renders it on the server first and a top-level import would break the build.
 *
 * Tiles are Esri's World Light Gray Canvas: keyless, and already the quiet
 * grey this page wants, so the markers are the only colour on it.
 *
 * Two others were tried. CARTO's Positron is the obvious choice and matches
 * the palette best, but its CDN stamps every keyless tile with "API KEY
 * REQUIRED" while returning 200, so the map looks correct to every check that
 * is not a human eye; that is still true. Stadia hosts the same styles and
 * answers 401 without a key, which at least fails honestly. Plain OSM was
 * what this used, desaturated in CSS to stop it being the loudest thing on
 * the page: that filter is gone with it, since the tiles are grey to begin
 * with and filtering them again only flattened the road hierarchy.
 *
 */
export function PermitMapView({
  permits,
  streetWork = [],
  onHover: onHoverProp,
  className,
}: {
  permits: Permit[];
  /**
   * Street work is the answer this card exists to give, so it is drawn over
   * the building permits rather than beside them: warm and larger, against
   * the grey filings that are only context.
   */
  streetWork?: StreetWork[];
  /**
   * Hovering a street-work marker reports it, with the pointer's viewport
   * position, so the card can render the detail in a portal outside the map.
   * Anything drawn inside the map is clipped by its overflow, which is what
   * cut the labels off.
   */
  onHover?: (target: HoverTarget | null, at?: { x: number; y: number }) => void;
  className?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  // Held in a ref so a changing callback never tears down and rebuilds the map.
  const onHover = useRef(onHoverProp);
  onHover.current = onHoverProp;

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

      // The tile credit is required; Leaflet's own "Leaflet" prefix is not.
      // Leaflet is BSD-2-Clause and its docs ask for the flag as a courtesy
      // rather than a condition, so it goes and the credit stays.
      instance.attributionControl.setPrefix(false);

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          // The grey canvas has no tiles past 16: above it Esri answers 200
          // with a 2.5KB blank square. maxNativeZoom stops at the last real
          // one and upscales it, so zooming further softens the basemap
          // instead of emptying it, and the markers stay crisp over it.
          maxNativeZoom: 16,
          /*
           * Required, not decoration: Esri's terms ask for it and the OSM
           * data under it is ODbL. Taken verbatim from the service's own
           * copyrightText rather than typed from memory, which had this
           * layer credited to DeLorme and NAVTEQ, who are not in it.
           */
          attribution:
            'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      ).addTo(instance);

      /*
       * Square markers. Leaflet's CircleMarker cannot be anything but round,
       * so these are plain markers carrying a divIcon: a box sized in screen
       * pixels, which is what the circles were too, rather than a Rectangle,
       * which is sized in degrees and would grow and shrink with the zoom.
       *
       * `className: ""` matters. Leaflet's default divIcon class paints a
       * white background and a border of its own, which would frame every
       * marker in a second square.
       *
       * Borders are thinner than the circles' stroke widths were, and not by
       * taste: an SVG stroke straddles the path, half outside it, while a
       * border-box border eats entirely into the element. Carrying the old
       * weights over left a 12px marker showing 8px of fill inside a ring
       * that read as the marker itself.
       */
      const squareMarker = (
        lat: number,
        lon: number,
        o: { size: number; weight: number; color: string; fill: string },
      ) =>
        L.marker([lat, lon], {
          icon: L.divIcon({
            className: "",
            iconSize: [o.size, o.size],
            iconAnchor: [o.size / 2, o.size / 2],
            html: `<span style="display:block;width:100%;height:100%;box-sizing:border-box;background:${o.fill};border:${o.weight}px solid ${o.color}"></span>`,
          }),
        });

      // Permits first, so the store marker is never buried under a dot.
      for (const p of permits) {
        squareMarker(p.lat, p.lon, {
          size: 8,
          weight: 1,
          color: "#71717a",
          fill: STREET_COLORS.building,
        })
          .addTo(instance)
          // Reported upward like the street work: these titles run to
          // hundreds of characters and an in-map tooltip clipped them.
          .on("mouseover", (e) => {
            const ev = e.originalEvent as MouseEvent;
            onHover.current?.({ kind: "permit", permit: p }, { x: ev.clientX, y: ev.clientY });
          })
          .on("mousemove", (e) => {
            const ev = e.originalEvent as MouseEvent;
            onHover.current?.({ kind: "permit", permit: p }, { x: ev.clientX, y: ev.clientY });
          })
          .on("mouseout", () => onHover.current?.(null));
      }

      /*
       * Three kinds of street work, three readings. A live dig is the thing
       * that can block the door. A no-dig moratorium segment is the opposite:
       * protection, not a warning, so it must not be painted like a hazard.
       * Planned repaving sits between them, on a horizon of months.
       */
      for (const w of streetWork) {
        const style =
          w.workType === "pavement_moratorium"
            ? { size: 6, fill: STREET_COLORS.moratorium, weight: 1 }
            : w.workType.startsWith("pavement_project")
              ? { size: 10, fill: STREET_COLORS.planned, weight: 1 }
              : { size: w.decision === "ALERT" ? 12 : 10, fill: STREET_COLORS.active, weight: 1 };

        squareMarker(w.lat, w.lon, {
          size: style.size,
          weight: style.weight,
          color: "#ffffff",
          fill: style.fill,
        })
          .addTo(instance)
          .on("mouseover", (e) => {
            const ev = e.originalEvent as MouseEvent;
            onHover.current?.({ kind: "work", work: w }, { x: ev.clientX, y: ev.clientY });
          })
          .on("mousemove", (e) => {
            const ev = e.originalEvent as MouseEvent;
            onHover.current?.({ kind: "work", work: w }, { x: ev.clientX, y: ev.clientY });
          })
          .on("mouseout", () => onHover.current?.(null));
      }

      squareMarker(STORE_ANCHOR.lat, STORE_ANCHOR.lon, {
        size: 14,
        weight: 1,
        color: "#ffffff",
        fill: "#28619e",
      })
        .addTo(instance)
        // "Your store" is two words at the map's centre, so Leaflet's own
        // tooltip cannot clip and is left alone. It still clears the portal
        // card, or the previous marker's panel hangs behind it.
        .bindTooltip("Your store", { direction: "top" })
        .on("mouseover", () => onHover.current?.(null))
        .on("mouseout", () => onHover.current?.(null));

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
        instance.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
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
      className={className ?? ""}
      role="img"
      aria-label={`Map of ${permits.length} permits filed near the store`}
    />
  );
}
