"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureMonth } from "@/lib/finance";
import { currencies, parseAmountToCents } from "@/lib/money";

const monthKey = z.string().regex(/^\d{4}-\d{2}$/);

const updateIncomeSchema = z.object({
  monthKey,
  memberId: z.string().min(1),
});

const createExpenseSchema = z.object({
  monthKey,
  name: z.string().trim().min(1).max(80),
  currency: z.enum(currencies),
  category: z.string().trim().max(40).optional(),
  note: z.string().trim().max(140).optional(),
});

const expenseIdSchema = z.object({
  expenseId: z.string().min(1),
});

const movementIdSchema = z.object({
  movementId: z.string().min(1),
});

const createExpenseMovementSchema = z.object({
  expenseId: z.string().min(1),
  note: z.string().trim().max(80).optional(),
});

export async function updateIncome(formData: FormData) {
  const parsed = updateIncomeSchema.safeParse({
    monthKey: formData.get("monthKey"),
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return;
  }

  const month = await ensureMonth(parsed.data.monthKey);

  await Promise.all(
    currencies.map((currency) =>
      prisma.income.upsert({
        create: {
          amountCents: parseAmountToCents(formData.get(`${currency}Amount`)),
          currency,
          memberId: parsed.data.memberId,
          monthId: month.id,
        },
        update: {
          amountCents: parseAmountToCents(formData.get(`${currency}Amount`)),
        },
        where: {
          monthId_memberId_currency: {
            currency,
            memberId: parsed.data.memberId,
            monthId: month.id,
          },
        },
      }),
    ),
  );

  revalidatePath("/");
}

export async function createExpense(formData: FormData) {
  const parsed = createExpenseSchema.safeParse({
    category: formData.get("category") || undefined,
    currency: formData.get("currency"),
    monthKey: formData.get("monthKey"),
    name: formData.get("name"),
    note: formData.get("note") || undefined,
  });
  const amountCents = parseAmountToCents(formData.get("amount"));

  if (!parsed.success || amountCents <= 0) {
    return;
  }

  const month = await ensureMonth(parsed.data.monthKey);

  await prisma.expense.create({
    data: {
      amountCents,
      category: parsed.data.category || null,
      currency: parsed.data.currency,
      monthId: month.id,
      name: parsed.data.name,
      note: parsed.data.note || null,
    },
  });

  revalidatePath("/");
}

export async function toggleExpenseStatus(formData: FormData) {
  const parsed = expenseIdSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });

  if (!parsed.success) {
    return;
  }

  const expense = await prisma.expense.findUnique({
    include: {
      movements: true,
    },
    where: {
      id: parsed.data.expenseId,
    },
  });

  if (!expense) {
    return;
  }

  const isPaid = expense.status === "PAID";
  const spentCents = expense.movements.reduce(
    (sum, movement) => sum + movement.amountCents,
    0,
  );
  const remainingCents = Math.max(expense.amountCents - spentCents, 0);

  if (!isPaid && remainingCents > 0) {
    await prisma.expenseMovement.create({
      data: {
        amountCents: remainingCents,
        expenseId: expense.id,
        note: "Completado",
      },
    });
  }

  await prisma.expense.update({
    data: {
      paidAt: isPaid ? null : new Date(),
      status: isPaid ? "PENDING" : "PAID",
    },
    where: {
      id: expense.id,
    },
  });

  revalidatePath("/");
}

export async function createExpenseMovement(formData: FormData) {
  const parsed = createExpenseMovementSchema.safeParse({
    expenseId: formData.get("expenseId"),
    note: formData.get("movementNote") || undefined,
  });
  const amountCents = parseAmountToCents(formData.get("movementAmount"));

  if (!parsed.success || amountCents <= 0) {
    return;
  }

  await prisma.expenseMovement.create({
    data: {
      amountCents,
      expenseId: parsed.data.expenseId,
      note: parsed.data.note || null,
    },
  });

  await syncExpenseStatus(parsed.data.expenseId);

  revalidatePath("/");
}

export async function deleteExpenseMovement(formData: FormData) {
  const parsed = movementIdSchema.safeParse({
    movementId: formData.get("movementId"),
  });

  if (!parsed.success) {
    return;
  }

  const movement = await prisma.expenseMovement.findUnique({
    where: {
      id: parsed.data.movementId,
    },
  });

  if (!movement) {
    return;
  }

  await prisma.expenseMovement.delete({
    where: {
      id: movement.id,
    },
  });

  await syncExpenseStatus(movement.expenseId);

  revalidatePath("/");
}

export async function deleteExpense(formData: FormData) {
  const parsed = expenseIdSchema.safeParse({
    expenseId: formData.get("expenseId"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.expense.delete({
    where: {
      id: parsed.data.expenseId,
    },
  });

  revalidatePath("/");
}

async function syncExpenseStatus(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    include: {
      movements: true,
    },
    where: {
      id: expenseId,
    },
  });

  if (!expense) {
    return;
  }

  const spentCents = expense.movements.reduce(
    (sum, movement) => sum + movement.amountCents,
    0,
  );
  const isPaid = spentCents >= expense.amountCents;

  await prisma.expense.update({
    data: {
      paidAt: isPaid ? (expense.paidAt ?? new Date()) : null,
      status: isPaid ? "PAID" : "PENDING",
    },
    where: {
      id: expense.id,
    },
  });
}
