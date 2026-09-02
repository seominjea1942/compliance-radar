import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @tidbcloud/serverless is pure HTTP, so nothing needs externalizing.
  // Without this, Turbopack walks up past the repo and picks up an unrelated
  // package-lock.json in the parent directory.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
