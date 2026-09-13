/**
 * Marker colours, shared by the map and its legend so the two cannot drift.
 * Mirrors the palette tokens; Leaflet needs literals, not CSS variables.
 */
export const STREET_COLORS = {
  active: "#b42318",
  planned: "#c8873f",
  moratorium: "#93b3d4",
  building: "#a1a1aa",
} as const;
