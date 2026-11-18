import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, LogIn, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { btn, card } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth/context";
import { useLanguage } from "@/lib/i18n";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const a = t.auth;

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center px-4 py-16">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <span>{a.checkingSession}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className={`${card} text-center`} data-testid="auth-required-gate">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="font-display mt-5 text-2xl font-bold text-primary md:text-3xl">
            {a.gateTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
            {a.gateSubtitle}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/login" search={{ redirect: pathname }} className={btn.primary}>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {a.loginButton}
            </Link>
            <Link to="/register" search={{ redirect: pathname }} className={btn.outline}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {a.registerButton}
            </Link>
          </div>
          <div className="mt-6 border-t pt-5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t.common.goHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
