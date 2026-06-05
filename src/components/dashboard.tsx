"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Check,
  Circle,
  LogOut,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useFormStatus } from "react-dom";
import {
  createExpenseMovement,
  createExpense,
  deleteExpense,
  deleteExpenseMovement,
  toggleExpenseStatus,
  updateIncome,
} from "@/app/actions";
import { logout } from "@/app/auth-actions";
import { currencies, formatMoney } from "@/lib/money";
import type { DashboardData } from "@/lib/finance";

type DashboardProps = {
  data: DashboardData;
};

export function Dashboard({ data }: DashboardProps) {
  const pendingExpenses = data.expenses.filter(
    (expense) => expense.status === "PENDING",
  );
  const paidExpenses = data.expenses.filter((expense) => expense.status === "PAID");

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-teal-700">
              Finanzas familiares
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
              {data.month.label}
            </h1>
          </div>

          <nav className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            <MonthButton href={`/?month=${data.month.previousKey}`} label="Mes anterior">
              <ArrowLeft aria-hidden className="h-5 w-5" />
            </MonthButton>
            <MonthButton href="/" label="Mes actual">
              <span className="text-sm font-semibold">Hoy</span>
            </MonthButton>
            <MonthButton href={`/?month=${data.month.nextKey}`} label="Mes siguiente">
              <ArrowRight aria-hidden className="h-5 w-5" />
            </MonthButton>
            <form action={logout}>
              <button
                aria-label="Cerrar sesion"
                className="flex h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                title="Cerrar sesion"
                type="submit"
              >
                <LogOut aria-hidden className="h-5 w-5" />
              </button>
            </form>
          </nav>
        </header>

        <section className="flex min-w-0 flex-col gap-4">
          <PanelTitle
            icon={<WalletCards aria-hidden className="h-5 w-5" />}
            title="Ingresos"
            tone="income"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {data.members.map((member) => (
              <IncomeCard key={member.id} member={member} monthKey={data.month.key} />
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <PanelTitle
            icon={<BadgeDollarSign aria-hidden className="h-5 w-5" />}
            title="Total del mes"
            tone="total"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {currencies.map((currency) => (
              <CurrencySummary
                currency={currency}
                key={currency}
                totals={data.totals[currency]}
              />
            ))}
          </div>
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex min-w-0 flex-col gap-4">
            <PanelTitle
              icon={<Plus aria-hidden className="h-5 w-5" />}
              title="Nuevo gasto"
              tone="expense"
            />
            <ExpenseForm monthKey={data.month.key} />
          </section>

          <section className="flex min-w-0 flex-col gap-4">
            <PanelTitle
              icon={<ReceiptText aria-hidden className="h-5 w-5" />}
              title="Gastos del mes"
              tone="list"
            />
            <ExpenseGroup
              emptyText="Sin gastos en curso"
              expenses={pendingExpenses}
              title="En curso"
            />
            <ExpenseGroup
              emptyText="Todavia no hay gastos completos"
              expenses={paidExpenses}
              title="Completos"
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function MonthButton({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="flex h-11 min-w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900"
      href={href}
      title={label}
    >
      {children}
    </Link>
  );
}

const currencyThemes = {
  ARS: {
    card: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    label: "text-emerald-700",
    total: "text-emerald-950",
  },
  USD: {
    card: "border-indigo-200 bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-700",
    label: "text-indigo-700",
    total: "text-indigo-950",
  },
} as const;

const metricThemes = {
  income: {
    box: "border-sky-100 bg-sky-50",
    label: "text-sky-700",
    value: "text-sky-950",
  },
  paid: {
    box: "border-emerald-100 bg-emerald-50",
    label: "text-emerald-700",
    value: "text-emerald-950",
  },
  pending: {
    box: "border-amber-100 bg-amber-50",
    label: "text-amber-700",
    value: "text-amber-950",
  },
} as const;

const panelTitleThemes = {
  default: "bg-slate-900 text-white",
  expense: "bg-rose-600 text-white",
  income: "bg-sky-600 text-white",
  list: "bg-violet-600 text-white",
  total: "bg-emerald-600 text-white",
} as const;

function CurrencySummary({
  currency,
  totals,
}: {
  currency: "ARS" | "USD";
  totals: DashboardData["totals"]["ARS"];
}) {
  const remainingIsNegative = totals.remainingCents < 0;
  const theme = currencyThemes[currency];

  return (
    <article
      className={`rounded-lg border p-4 shadow-sm ${theme.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-bold ${theme.label}`}>{currency}</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              remainingIsNegative ? "text-rose-700" : theme.total
            }`}
          >
            {formatMoney(totals.remainingCents, currency)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${theme.icon}`}>
          <BadgeDollarSign aria-hidden className="h-5 w-5" />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <Metric
          label="Ingresos"
          tone="income"
          value={formatMoney(totals.incomeCents, currency)}
        />
        <Metric
          label="Gastado"
          tone="paid"
          value={formatMoney(totals.paidCents, currency)}
        />
        <Metric
          label="Pendiente"
          tone="pending"
          value={formatMoney(totals.pendingCents, currency)}
        />
      </dl>
    </article>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "income" | "paid" | "pending";
  value: string;
}) {
  const metricTheme = metricThemes[tone];

  return (
    <div className={`rounded-md border px-3 py-2 ${metricTheme.box}`}>
      <dt className={`text-xs font-bold ${metricTheme.label}`}>{label}</dt>
      <dd className={`mt-1 break-words text-sm font-semibold leading-tight ${metricTheme.value}`}>
        {value}
      </dd>
    </div>
  );
}

function PanelTitle({
  icon,
  title,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "expense" | "income" | "list" | "total";
}) {
  const theme = panelTitleThemes[tone];

  return (
    <div className="flex items-center gap-2 text-slate-900">
      <span className={`flex h-9 w-9 items-center justify-center rounded-md ${theme}`}>
        {icon}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

function IncomeCard({
  member,
  monthKey,
}: {
  member: DashboardData["members"][number];
  monthKey: string;
}) {
  const memberAccent = getMemberAccentStyle(member.color);

  return (
    <form
      action={updateIncome}
      className="max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      style={memberAccent.card}
    >
      <input name="monthKey" type="hidden" value={monthKey} />
      <input name="memberId" type="hidden" value={member.id} />

      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-base font-black"
          style={memberAccent.badge}
        >
          {member.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-950">
            {member.name}
          </h3>
          <p className="text-sm text-slate-500">{member.role}</p>
        </div>
        <SubmitIconButton label="Guardar ingreso">
          <Save aria-hidden className="h-4 w-4" />
        </SubmitIconButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {currencies.map((currency) => (
          <label className="block min-w-0" key={currency}>
            <span className="text-xs font-semibold text-slate-500">{currency}</span>
            <AmountInput
              defaultAmountCents={member.incomes[currency]}
              name={`${currency}Amount`}
            />
          </label>
        ))}
      </div>
    </form>
  );
}

function ExpenseForm({ monthKey }: { monthKey: string }) {
  return (
    <form
      action={createExpense}
      className="grid max-w-full gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input name="monthKey" type="hidden" value={monthKey} />

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">Nombre</span>
        <input
          className="h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-medium outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
          maxLength={80}
          name="name"
          placeholder="Alquiler, supermercado, internet..."
          required
          type="text"
        />
      </label>

      <div className="grid grid-cols-[1fr_108px] gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-500">Monto</span>
          <AmountInput name="amount" required />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-500">Moneda</span>
          <select
            className="h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            defaultValue="ARS"
            name="currency"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold text-slate-500">Categoria</span>
          <input
            className="h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            maxLength={40}
            name="category"
            placeholder="Hogar"
            type="text"
          />
        </label>

        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold text-slate-500">Nota</span>
          <input
            className="h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            maxLength={140}
            name="note"
            placeholder="Opcional"
            type="text"
          />
        </label>
      </div>

      <SubmitTextButton />
    </form>
  );
}

function ExpenseGroup({
  emptyText,
  expenses,
  title,
}: {
  emptyText: string;
  expenses: DashboardData["expenses"];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase text-slate-500">
          {title}
        </h3>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
          {expenses.length}
        </span>
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-medium text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="grid gap-2">
          {expenses.map((expense) => (
            <ExpenseItem expense={expense} key={expense.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseItem({ expense }: { expense: DashboardData["expenses"][number] }) {
  const isPaid = expense.status === "PAID";
  const overSpentCents = Math.max(expense.spentCents - expense.amountCents, 0);
  const remainingLabel =
    overSpentCents > 0
      ? `Extra ${formatMoney(overSpentCents, expense.currency)}`
      : expense.remainingCents === 0
        ? "Completo"
        : formatMoney(expense.remainingCents, expense.currency);

  return (
    <li className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <form action={toggleExpenseStatus}>
          <input name="expenseId" type="hidden" value={expense.id} />
          <ExpenseStatusButton isPaid={isPaid} />
        </form>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p
              className={`truncate text-sm font-bold text-slate-950 ${
                isPaid ? "line-through decoration-2 decoration-emerald-500" : ""
              }`}
            >
              {expense.name}
            </p>
            <p className="shrink-0 text-sm font-bold text-slate-950">
              {formatMoney(expense.amountCents, expense.currency)}
            </p>
          </div>

          <div className="mt-1 flex min-w-0 gap-2 text-xs font-medium text-slate-500">
            {expense.category ? (
              <span className="truncate">{expense.category}</span>
            ) : null}
            {expense.note ? <span className="truncate">{expense.note}</span> : null}
          </div>
        </div>

        <form action={deleteExpense}>
          <input name="expenseId" type="hidden" value={expense.id} />
          <button
            aria-label="Borrar gasto"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            title="Borrar gasto"
            type="submit"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniMetric
          label="Separado"
          value={formatMoney(expense.amountCents, expense.currency)}
        />
        <MiniMetric
          label="Gastado"
          value={formatMoney(expense.spentCents, expense.currency)}
        />
        <MiniMetric label="Queda" value={remainingLabel} />
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            overSpentCents > 0
              ? "bg-rose-500"
              : isPaid
                ? "bg-emerald-500"
                : "bg-sky-500"
          }`}
          style={{ width: `${expense.progress}%` }}
        />
      </div>

      <form
        action={createExpenseMovement}
        className="mt-3 grid gap-2 rounded-md border border-sky-100 bg-white p-2 sm:grid-cols-[1fr_1.2fr_auto]"
      >
        <input name="expenseId" type="hidden" value={expense.id} />
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold text-slate-500">Gastado ahora</span>
          <AmountInput name="movementAmount" required />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold text-slate-500">Detalle</span>
          <input
            className="h-12 min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
            maxLength={80}
            name="movementNote"
            placeholder="Semana 1"
            type="text"
          />
        </label>
        <AddMovementButton />
      </form>

      {expense.movements.length > 0 ? (
        <ul className="mt-3 grid gap-1">
          {expense.movements.map((movement) => (
            <li
              className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md bg-white px-2 py-2 text-sm"
              key={movement.id}
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {formatMoney(movement.amountCents, expense.currency)}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {movement.note || "Movimiento"} · {formatMovementDate(movement.spentAt)}
                </p>
              </div>
              <form action={deleteExpenseMovement}>
                <input name="movementId" type="hidden" value={movement.id} />
                <button
                  aria-label="Borrar movimiento"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  title="Borrar movimiento"
                  type="submit"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ExpenseStatusButton({ isPaid }: { isPaid: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={isPaid ? "Reabrir gasto" : "Completar gasto"}
      aria-pressed={isPaid}
      className={`flex h-10 w-10 cursor-pointer touch-manipulation items-center justify-center rounded-md border transition disabled:cursor-wait disabled:opacity-60 ${
        isPaid
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-700"
      }`}
      disabled={pending}
      title={isPaid ? "Reabrir gasto" : "Completar gasto"}
      type="submit"
    >
      {isPaid ? (
        <Check aria-hidden className="h-5 w-5" />
      ) : (
        <Circle aria-hidden className="h-5 w-5" />
      )}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-white px-2 py-2">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-black leading-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SubmitIconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      title={label}
      type="submit"
    >
      {children}
    </button>
  );
}

function SubmitTextButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-1 flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-base font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <Plus aria-hidden className="h-5 w-5" />
      {pending ? "Agregando" : "Agregar gasto"}
    </button>
  );
}

function AddMovementButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex h-12 items-center justify-center gap-2 self-end rounded-md bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <Plus aria-hidden className="h-4 w-4" />
      {pending ? "Sumando" : "Sumar"}
    </button>
  );
}

function getMemberAccentStyle(color: string): {
  badge: CSSProperties;
  card: CSSProperties;
} {
  return {
    badge: {
      backgroundColor: colorWithAlpha(color, 0.14),
      color,
    },
    card: {
      backgroundColor: colorWithAlpha(color, 0.04),
      borderColor: colorWithAlpha(color, 0.28),
    },
  };
}

function colorWithAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatMovementDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function AmountInput({
  defaultAmountCents,
  name,
  required,
}: {
  defaultAmountCents?: number;
  name: string;
  required?: boolean;
}) {
  return (
    <input
      className="mt-1 h-12 w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
      defaultValue={
        defaultAmountCents === undefined
          ? undefined
          : formatAmountCentsForInput(defaultAmountCents)
      }
      inputMode="decimal"
      name={name}
      onBlur={formatAmountEventValue}
      onChange={formatAmountEventValue}
      onInput={formatAmountEventValue}
      placeholder="0"
      required={required}
      type="text"
    />
  );
}

function formatAmountEventValue(event: React.FormEvent<HTMLInputElement>) {
  event.currentTarget.value = formatAmountInputValue(event.currentTarget.value);
}

function formatAmountCentsForInput(amountCents: number) {
  const amount = amountCents / 100;
  const rawValue = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(".", ",");

  return formatAmountInputValue(rawValue);
}

function formatAmountInputValue(value: string) {
  const normalized = value.replace(/[^\d,]/g, "");
  const [integerPart = "", decimalPart] = normalized.split(",", 2);
  const integerDigits = integerPart.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const formattedInteger = (integerDigits || "0").replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );

  if (value.trim() === "") {
    return "";
  }

  if (decimalPart !== undefined) {
    return `${formattedInteger},${decimalPart.replace(/\D/g, "").slice(0, 2)}`;
  }

  return formattedInteger;
}
