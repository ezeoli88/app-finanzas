"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSessionToken,
  isAuthConfigured,
  sanitizeRedirectPath,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyCredentials,
} from "@/lib/session-token";

export type LoginState = {
  error?: string;
};

const loginSchema = z.object({
  next: z.string().optional(),
  password: z.string().min(1),
  username: z.string().trim().min(1),
});

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      error:
        "Falta configurar FINANZA_AUTH_USERS y FINANZA_SESSION_SECRET en las variables de entorno.",
    };
  }

  const parsed = loginSchema.safeParse({
    next: formData.get("next") || undefined,
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: "Completa usuario y contrasena." };
  }

  const user = verifyCredentials(parsed.data.username, parsed.data.password);

  if (!user) {
    return { error: "Usuario o contrasena incorrectos." };
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(user.username), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(sanitizeRedirectPath(parsed.data.next ?? "/"));
}
