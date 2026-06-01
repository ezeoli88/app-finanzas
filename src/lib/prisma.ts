import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  sqliteReady?: boolean;
};

function resolveSqlitePath(url: string) {
  if (url === ":memory:") {
    return url;
  }

  const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;

  if (filePath.startsWith("./") || filePath.startsWith(".\\")) {
    return path.join(process.cwd(), "prisma", path.basename(filePath));
  }

  return path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), "prisma", path.basename(filePath));
}

function ensureSqliteSchema() {
  if (globalForPrisma.sqliteReady) {
    return;
  }

  const dbPath = resolveSqlitePath(databaseUrl);

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "HouseholdMember" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "role" TEXT,
      "color" TEXT NOT NULL DEFAULT '#0f766e',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "MonthBudget" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Income" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "amountCents" INTEGER NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'ARS',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "memberId" TEXT NOT NULL,
      "monthId" TEXT NOT NULL,
      CONSTRAINT "Income_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Income_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "amountCents" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'ARS',
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "category" TEXT,
      "note" TEXT,
      "paidAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "monthId" TEXT NOT NULL,
      "paidById" TEXT,
      CONSTRAINT "Expense_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthBudget" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "HouseholdMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "ExpenseMovement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "amountCents" INTEGER NOT NULL,
      "note" TEXT,
      "spentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

  db.close();
  globalForPrisma.sqliteReady = true;
}

ensureSqliteSchema();

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
