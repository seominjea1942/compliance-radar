import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 is a native-ish driver; keep it out of the bundler.
  serverExternalPackages: ["mysql2"],
  // Without this, Turbopack walks up past the repo and picks up an unrelated
  // package-lock.json in the parent directory.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
