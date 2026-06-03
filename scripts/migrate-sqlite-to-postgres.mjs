import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Pool } = pg;

const sqlitePath = process.argv[2] ?? "prisma/dev.db";
const replaceTarget = process.argv.includes("--replace");
const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL o POSTGRES_URL apuntando a la Postgres destino.");
}

if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
  throw new Error("La URL destino debe ser de Postgres.");
}

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  await ensureSchema(pool);

  const source = {
    members: sqlite.prepare('SELECT * FROM "HouseholdMember" ORDER BY "createdAt"').all(),
    months: sqlite.prepare('SELECT * FROM "MonthBudget" ORDER BY "key"').all(),
    incomes: sqlite.prepare('SELECT * FROM "Income" ORDER BY "createdAt"').all(),
    expenses: sqlite.prepare('SELECT * FROM "Expense" ORDER BY "createdAt"').all(),
    movements: sqlite.prepare('SELECT * FROM "ExpenseMovement" ORDER BY "createdAt"').all(),
  };

  const before = await getTargetCounts(pool);
  const targetHasData = Object.values(before).some((count) => count > 0);

  if (targetHasData && !replaceTarget) {
    console.log(JSON.stringify({ status: "blocked", reason: "target_has_data", before }, null, 2));
    process.exitCode = 2;
  } else {
    if (replaceTarget) {
      await pool.query(`
        TRUNCATE TABLE
          "ExpenseMovement",
          "Expense",
          "Income",
          "MonthBudget",
          "HouseholdMember"
        RESTART IDENTITY CASCADE;
      `);
    }

    await insertRows(pool, "HouseholdMember", [
      "id",
      "name",
      "role",
      "color",
      "createdAt",
      "updatedAt",
    ], source.members);
    await insertRows(pool, "MonthBudget", [
      "id",
      "key",
      "label",
      "createdAt",
      "updatedAt",
    ], source.months);
    await insertRows(pool, "Income", [
      "id",
      "amountCents",
      "currency",
      "createdAt",
      "updatedAt",
      "memberId",
      "monthId",
    ], source.incomes);
    await insertRows(pool, "Expense", [
      "id",
      "name",
      "amountCents",
      "currency",
      "status",
      "category",
      "note",
      "paidAt",
      "createdAt",
      "updatedAt",
      "monthId",
      "paidById",
    ], source.expenses);
    await insertRows(pool, "ExpenseMovement", [
      "id",
      "amountCents",
      "note",
      "spentAt",
      "createdAt",
      "expenseId",
    ], source.movements);

    const after = await getTargetCounts(pool);
    console.log(JSON.stringify({ status: "ok", imported: getSourceCounts(source), before, after }, null, 2));
  }
} finally {
  sqlite.close();
  await pool.end();
}

async function insertRows(pool, table, columns, rows) {
  if (rows.length === 0) {
    return;
  }

  const columnSql = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const updateSql = columns
    .filter((column) => column !== "id")
    .map((column) => `"${column}" = EXCLUDED."${column}"`)
    .join(", ");
  const sql = `
    INSERT INTO "${table}" (${columnSql})
    VALUES (${placeholders})
    ON CONFLICT ("id") DO UPDATE SET ${updateSql};
  `;

  for (const row of rows) {
    await pool.query(sql, columns.map((column) => row[column]));
  }
}

function getSourceCounts(source) {
  return Object.fromEntries(
    Object.entries(source).map(([key, rows]) => [key, rows.length]),
  );
}

async function getTargetCounts(pool) {
  const tables = [
    "HouseholdMember",
    "MonthBudget",
    "Income",
    "Expense",
    "ExpenseMovement",
  ];
  const counts = {};

  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    counts[table] = result.rows[0].count;
  }

  return counts;
}

async function ensureSchema(pool) {
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
}
