"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The visual at the head of a recall card.
 *
 * Two honest sources, in order. FDA's own product photo where the item came
 * from a press release, and otherwise a barcode drawn from the recorded UPC —
 * real data rendered as a graphic rather than decoration. An item with neither
 * gets nothing at all; inventing a picture for a recall is how an owner ends
 * up checking the wrong product.
 *
 * Photos are hotlinked per the contract, so a URL can 404 without warning. The
 * container removes itself on error instead of leaving a broken frame.
 */
export function ItemMedia({
  image,
  upc,
  alt,
  className,
}: {
  image?: string;
  upc?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const showBarcode = (!image || failed) && !!upc;

  useEffect(() => {
    if (!showBarcode || !barcodeRef.current || !upc) return;
    let cancelled = false;

    (async () => {
      const { default: JsBarcode } = await import("jsbarcode");
      if (cancelled || !barcodeRef.current) return;
      // A 12-digit code is a UPC-A and a 13-digit one an EAN-13; anything else
      // is still a real code, just not one of those symbologies, so it is
      // drawn as Code 128 rather than being forced into a format it fails.
      const format = upc.length === 12 ? "UPC" : upc.length === 13 ? "EAN13" : "CODE128";
      try {
        JsBarcode(barcodeRef.current, upc, {
          format,
          displayValue: true,
          fontSize: 13,
          font: "ui-monospace, monospace",
          height: 42,
          margin: 6,
          background: "#00000000",
          lineColor: "#3f3f46",
        });
      } catch {
        // An invalid code is not worth a broken graphic.
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showBarcode, upc]);

  if (!image && !upc) return null;
  if (failed && !upc) return null;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg border border-line bg-wash ${className ?? ""}`}
    >
      {showBarcode ? (
        <svg ref={barcodeRef} role="img" aria-label={`Barcode ${upc}`} className="max-h-full max-w-full" />
      ) : (
        /* Plain img, not next/image: these are hotlinked third-party URLs, and
           contain rather than cover because a recall photo is often a label or
           a packet shot that must not be cropped. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      )}
    </div>
  );
}
