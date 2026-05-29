import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL и его нативные драйверы не должны «запекаться» в сборку —
  // помечаем их как внешние серверные пакеты, чтобы сборка на Railway не падала.
  serverExternalPackages: ["@libsql/client", "@libsql/client/web", "libsql"],
};

export default nextConfig;
