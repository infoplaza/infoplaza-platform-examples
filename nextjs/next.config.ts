import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The component library is shipped as ESM and compiled with the app rather
  // than consumed as it is, which is what its Next.js setup asks for.
  transpilePackages: ["@infoplaza/platform"],
};

export default nextConfig;
