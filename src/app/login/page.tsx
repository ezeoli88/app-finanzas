import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { sanitizeRedirectPath } from "@/lib/session-token";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = sanitizeRedirectPath(nextParam ?? "/");
  const session = await getSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8 text-slate-950">
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
