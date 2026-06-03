import { ensureDatabase, prisma } from "@/lib/prisma";
import { currencies, type CurrencyCode } from "@/lib/money";
import { getMonthLabel, shiftMonthKey } from "@/lib/months";
import { requireAuth } from "@/lib/auth";

const defaultMembers = [
  { name: "Yo", role: "Sueldo neto", color: "#0f766e" },
  { name: "Mi esposa", role: "Sueldo neto", color: "#2563eb" },
];

type CurrencyTotals = Record<
  CurrencyCode,
  {
    incomeCents: number;
    paidCents: number;
    pendingCents: number;
    plannedCents: number;
    remainingCents: number;
  }
>;

export async function getDashboardData(monthKey: string) {
  await requireAuth();
  await ensureDatabase();

  const { month, members } = await ensureBaseData(monthKey);

  const monthWithData = await prisma.monthBudget.findUniqueOrThrow({
    where: { id: month.id },
    include: {
      expenses: {
        include: {
          movements: {
            orderBy: { spentAt: "desc" },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
      incomes: true,
    },
  });

  const totals = createEmptyTotals();

  for (const income of monthWithData.incomes) {
    totals[income.currency].incomeCents += income.amountCents;
  }

  const expenses = monthWithData.expenses.map((expense) => {
    const rawSpentCents = expense.movements.reduce(
      (sum, movement) => sum + movement.amountCents,
      0,
    );
    const spentCents =
      rawSpentCents > 0 || expense.status === "PENDING"
        ? rawSpentCents
        : expense.amountCents;
    const remainingCents = Math.max(expense.amountCents - spentCents, 0);
    const plannedCents = Math.max(expense.amountCents, spentCents);
    const progress =
      expense.amountCents > 0
        ? Math.min(100, Math.round((spentCents / expense.amountCents) * 100))
        : 0;

    totals[expense.currency].paidCents += spentCents;
    totals[expense.currency].pendingCents += remainingCents;

    return {
      id: expense.id,
      name: expense.name,
      amountCents: expense.amountCents,
      currency: expense.currency,
      status: expense.status,
      category: expense.category,
      note: expense.note,
      spentCents,
      remainingCents,
      plannedCents,
      progress,
      createdAt: expense.createdAt.toISOString(),
      paidAt: expense.paidAt?.toISOString() ?? null,
      movements: expense.movements.map((movement) => ({
        id: movement.id,
        amountCents: movement.amountCents,
        note: movement.note,
        spentAt: movement.spentAt.toISOString(),
      })),
    };
  });

  for (const currency of currencies) {
    totals[currency].plannedCents =
      totals[currency].paidCents + totals[currency].pendingCents;
    totals[currency].remainingCents =
      totals[currency].incomeCents - totals[currency].plannedCents;
  }

  return {
    month: {
      id: monthWithData.id,
      key: monthWithData.key,
      label: monthWithData.label,
      nextKey: shiftMonthKey(monthWithData.key, 1),
      previousKey: shiftMonthKey(monthWithData.key, -1),
    },
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      color: member.color,
      incomes: Object.fromEntries(
        currencies.map((currency) => {
          const income = monthWithData.incomes.find(
            (item) => item.memberId === member.id && item.currency === currency,
          );

          return [currency, income?.amountCents ?? 0];
        }),
      ) as Record<CurrencyCode, number>,
    })),
    expenses,
    totals,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function ensureMonth(monthKey: string) {
  await ensureDatabase();

  return prisma.monthBudget.upsert({
    create: {
      key: monthKey,
      label: getMonthLabel(monthKey),
    },
    update: {
      label: getMonthLabel(monthKey),
    },
    where: {
      key: monthKey,
    },
  });
}

async function ensureBaseData(monthKey: string) {
  let members = await prisma.householdMember.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (members.length === 0) {
    await prisma.householdMember.createMany({
      data: defaultMembers,
    });

    members = await prisma.householdMember.findMany({
      orderBy: { createdAt: "asc" },
    });
  }

  const month = await ensureMonth(monthKey);

  return { members, month };
}

function createEmptyTotals(): CurrencyTotals {
  return Object.fromEntries(
    currencies.map((currency) => [
      currency,
      {
        incomeCents: 0,
        paidCents: 0,
        pendingCents: 0,
        plannedCents: 0,
        remainingCents: 0,
      },
    ]),
  ) as CurrencyTotals;
}
