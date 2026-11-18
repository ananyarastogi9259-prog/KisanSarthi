import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { z } from "zod";
import { btn, card, PageHeader } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth/context";
import { useDocumentTitle, useLanguage } from "@/lib/i18n";

const searchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Login – KisanSarthi" },
      {
        name: "description",
        content: "Login to KisanSarthi to access government schemes and tools.",
      },
    ],
  }),
  component: LoginPage,
});

function sanitizeRedirect(target?: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/schemes";
  return target;
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const safeRedirect = sanitizeRedirect(redirect);
  const { user, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const a = t.auth;
  useDocumentTitle(a.loginMetaTitle);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingList, setMissingList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      void navigate({ to: safeRedirect });
    }
  }, [user, navigate, safeRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMissingList([]);
    setFieldErrors({});

    const missing: string[] = [];
    const newFieldErrors: typeof fieldErrors = {};

    if (!email.trim()) {
      missing.push("Email address is missing (please enter your email).");
      newFieldErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      missing.push("Email format is invalid (e.g. name@domain.com).");
      newFieldErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      missing.push("Password is missing (please enter your password).");
      newFieldErrors.password = "Password is required.";
    }

    if (missing.length > 0) {
      setMissingList(missing);
      setFieldErrors(newFieldErrors);
      setError("Please complete the following missing details:");
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      if (result.message) {
        setError(result.message);
      } else if (result.code === "email_not_confirmed") {
        setError("Your email has not been confirmed yet. Please verify your email via the confirmation link sent to your inbox, or click the One-Click Demo button below.");
      } else if (result.code === "invalid_credentials") {
        setError(a.errors.invalidCredentials);
      } else {
        setError(a.errors.genericError);
      }
      return;
    }

    void navigate({ to: safeRedirect });
  };

  return (
    <>
      <PageHeader title={a.loginTitle} subtitle={a.loginSubtitle} />
      <div className="mx-auto max-w-md px-4 py-10">
        <form onSubmit={handleSubmit} noValidate className={`${card} space-y-5`}>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              {missingList.length > 0 && (
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs font-medium pl-1">
                  {missingList.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold">
              {a.emailLabel} <span className="text-destructive">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={a.emailPlaceholder}
              className={`mt-2 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.email ? "border-destructive ring-1 ring-destructive" : ""
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold">
              {a.passwordLabel} <span className="text-destructive">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder={a.passwordPlaceholder}
                className={`h-11 w-full rounded-xl border bg-background pl-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring ${
                  fieldErrors.password ? "border-destructive ring-1 ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className={`${btn.primary} w-full`}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {submitting ? a.submittingLogin : a.submitLogin}
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase font-medium">Or</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setEmail("kisan2026@gmail.com");
              setPassword("Password@123");
              setSubmitting(true);
              const result = await login("kisan2026@gmail.com", "Password@123");
              setSubmitting(false);
              if (result.ok) {
                void navigate({ to: safeRedirect });
              }
            }}
            className={`${btn.outline} w-full text-xs font-semibold py-2.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-2`}
          >
            🌾 One-Click Demo Farmer Access (Instant Login)
          </button>

          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            {a.noAccountPrompt}{" "}
            <Link
              to="/register"
              search={redirect ? { redirect } : {}}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {a.goToRegister}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
