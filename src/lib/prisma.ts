import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const { Pool } = pg;

const globalForPrisma = globalThis as typeof globalThis & {
  databaseReady?: Promise<void>;
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no esta configurada. En Vercel, agrega una base Postgres/Neon y conecta sus variables de entorno.",
    );
  }

  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new Error(
      "DATABASE_URL debe ser una URL de Postgres para produccion en Vercel.",
    );
  }

  return databaseUrl;
}

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const adapter = new PrismaPg(getDatabaseUrl());
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function ensureDatabase() {
  globalForPrisma.databaseReady ??= createDatabaseSchema();

  return globalForPrisma.databaseReady;
}

async function createDatabaseSchema() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: 1,
  });

  try {
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS "HouseholdMember" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "role" TEXT,
        "color" TEXT NOT NULL DEFAULT '#0f766e',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "MonthBudget" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Income" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "amountCents" INTEGER NOT NULL DEFAULT 0,
        "currency" "Currency" NOT NULL DEFAULT 'ARS',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "memberId" TEXT NOT NULL,
        "monthId" TEXT NOT NULL,
        CONSTRAINT "Income_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Income_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "amountCents" INTEGER NOT NULL,
        "currency" "Currency" NOT NULL DEFAULT 'ARS',
        "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
        "category" TEXT,
        "note" TEXT,
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "monthId" TEXT NOT NULL,
        "paidById" TEXT,
        CONSTRAINT "Expense_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "ExpenseMovement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "amountCents" INTEGER NOT NULL,
        "note" TEXT,
        "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expenseId" TEXT NOT NULL,
        CONSTRAINT "ExpenseMovement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "MonthBudget_key_key" ON "MonthBudget"("key");
      CREATE INDEX IF NOT EXISTS "Income_memberId_idx" ON "Income"("memberId");
      CREATE UNIQUE INDEX IF NOT EXISTS "Income_monthId_memberId_currency_key" ON "Income"("monthId", "memberId", "currency");
      CREATE INDEX IF NOT EXISTS "Expense_monthId_status_idx" ON "Expense"("monthId", "status");
      CREATE INDEX IF NOT EXISTS "Expense_paidById_idx" ON "Expense"("paidById");
      CREATE INDEX IF NOT EXISTS "ExpenseMovement_expenseId_idx" ON "ExpenseMovement"("expenseId");
    `);
  } finally {
    await pool.end();
  }
}
