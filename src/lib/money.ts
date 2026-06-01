import type { Currency } from "@/generated/prisma/client";

export const currencies = ["ARS", "USD"] as const satisfies readonly Currency[];

export type CurrencyCode = (typeof currencies)[number];

export function formatMoney(amountCents: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(amountCents / 100);
}

export function parseAmountToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  const normalized = normalizeDecimalInput(trimmed);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed * 100));
}

export function amountCentsToInputValue(amountCents: number) {
  const value = amountCents / 100;

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function normalizeDecimalInput(value: string) {
  const compact = value.replace(/\s/g, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");

  if (hasComma && hasDot) {
    return compact.replace(/\./g, "").replace(",", ".");
  }

  if (hasComma) {
    return compact.replace(",", ".");
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    return compact.replace(/\./g, "");
  }

  return compact;
}
