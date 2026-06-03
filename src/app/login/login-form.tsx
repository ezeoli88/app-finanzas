"use client";

import { KeyRound, LogIn, UserRound } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form
      action={action}
      className="grid w-full max-w-sm gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <input name="next" type="hidden" value={nextPath} />

      <div>
        <p className="text-xs font-bold uppercase text-teal-700">
          Finanzas familiares
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">
          Acceso privado
        </h1>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">Usuario</span>
        <span className="grid h-12 grid-cols-[40px_1fr] items-center rounded-md border border-slate-200 bg-slate-50 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
          <UserRound aria-hidden className="mx-auto h-5 w-5 text-slate-400" />
          <input
            autoComplete="username"
            className="h-full min-w-0 bg-transparent pr-3 text-base font-semibold outline-none"
            name="username"
            required
            type="text"
          />
        </span>
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-500">Contrasena</span>
        <span className="grid h-12 grid-cols-[40px_1fr] items-center rounded-md border border-slate-200 bg-slate-50 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
          <KeyRound aria-hidden className="mx-auto h-5 w-5 text-slate-400" />
          <input
            autoComplete="current-password"
            className="h-full min-w-0 bg-transparent pr-3 text-base font-semibold outline-none"
            name="password"
            required
            type="password"
          />
        </span>
      </label>

      {state.error ? (
        <p className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-base font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <LogIn aria-hidden className="h-5 w-5" />
        {pending ? "Entrando" : "Entrar"}
      </button>
    </form>
  );
}
