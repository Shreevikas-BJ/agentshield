import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL);

    globalForPrisma.prisma = new PrismaClient({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  return globalForPrisma.prisma;
}

export function normalizeRuntimeDatabaseUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    const isSupabasePooler =
      url.hostname.includes("pooler.supabase.com") || url.port === "6543";

    if (!isSupabasePooler) {
      return databaseUrl;
    }

    if (!url.searchParams.get("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.get("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    if (!url.searchParams.get("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}
