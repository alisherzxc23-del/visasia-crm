import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL и его нативные драйверы не должны «запекаться» в серверную сборку.
  serverExternalPackages: ["@libsql/client", "@libsql/client/web", "libsql", "@libsql/isomorphic-ws"],
  outputFileTracingExcludes: {
    "*": ["node_modules/@libsql/**", "node_modules/libsql/**"],
  },
};

export default nextConfig;
