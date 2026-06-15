import { PrismaClient } from "@prisma/client";

// Prevent exhausting the PostgreSQL connection pool during Next.js HMR in development.
// globalThis is not cleared by HMR, so the same client instance is reused across hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
