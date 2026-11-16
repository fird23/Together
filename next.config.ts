import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Версия сайта (короткий хеш коммита на Vercel) попадает в отчёт админ-панели и в журнал ошибок.
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7),
  },
};

export default nextConfig;
