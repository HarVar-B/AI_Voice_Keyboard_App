import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 * 
 * This module exports a singleton Prisma Client instance to prevent
 * multiple database connections in development (where hot-reloading
 * can create multiple instances) and to optimize connection pooling.
 * 
 * Why Singleton Pattern?
 * - Next.js development mode hot-reloads modules, which could create
 *   multiple Prisma Client instances
 * - Each Prisma Client maintains its own connection pool
 * - Multiple instances = multiple connection pools = wasted resources
 * - Singleton ensures only one instance exists across hot-reloads
 * 
 * How It Works:
 * 1. Check if Prisma Client already exists in global scope
 * 2. If exists, reuse it (prevents new instance on hot-reload)
 * 3. If not, create new instance
 * 4. In development, store instance in global scope for reuse
 * 5. In production, Next.js handles instance management
 */

// Type-safe global variable for storing Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance
 * 
 * Configuration:
 * - Development: Logs queries, errors, and warnings (helpful for debugging)
 * - Production: Only logs errors (reduces log noise)
 * 
 * Connection Pooling:
 * - Prisma automatically manages connection pooling
 * - Default pool size: number of CPU cores + 1
 * - Connections are reused efficiently
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Store instance in global scope in development to prevent multiple instances on hot-reload
// In production, this is not needed as Next.js handles module caching
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

