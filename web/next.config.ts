import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/*
 * Pin the workspace root to this file's own directory, not process.cwd().
 * The dev server is launched with a `cd` from a parent directory, so cwd is
 * not reliable: with the wrong root, Turbopack resolved modules against the
 * parent and newly added dependencies (leaflet) failed to resolve in dev while
 * the production build, run from web/, worked fine.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // @tidbcloud/serverless is pure HTTP, so nothing needs externalizing.
  turbopack: { root: here },
};

export default nextConfig;
