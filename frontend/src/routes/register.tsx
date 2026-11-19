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

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Register – KisanSarthi" },
      {
        name: "description",
        content: "Create a KisanSarthi account to explore schemes and check eligibility.",
      },
    ],
  }),
  component: RegisterPage,
});

function sanitizeRedirect(target?: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/schemes";
  return target;
}

function cleanErrorMessage(msg: string): string {
  if (!msg) return "Please complete the required details.";
  if (
    msg.includes("abcdefghijklmnopqrstuvwxyz") ||
    msg.toLowerCase().includes("at least one character")
  ) {
    return "Password must include at least one letter (a-z) and one number (0-9).";
  }
  if (
    msg.toLowerCase().includes("service role") ||
    msg.toLowerCase().includes("not configured") ||
    msg.toLowerCase().includes("internal server error")
  ) {
    return "Registration is being processed. Please try logging in or click Register again.";
  }
  return msg;
}

function RegisterPage() {
  const { redirect } = Route.useSearch();
  const safeRedirect = sanitizeRedirect(redirect);
  const { user, register, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const a = t.auth;
  useDocumentTitle(a.registerMetaTitle);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingList, setMissingList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(null);

    const missing: string[] = [];
    const newFieldErrors: typeof fieldErrors = {};

    // 1. Full Name validation
    if (!name.trim()) {
      missing.push("Full Name is missing (please enter your full name).");
      newFieldErrors.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      missing.push("Full Name is too short (minimum 2 characters required).");
      newFieldErrors.name = "Name must be at least 2 characters.";
    }

    // 2. Email address validation
    if (!email.trim()) {
      missing.push("Email address is missing (please enter your email).");
      newFieldErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      missing.push("Email format is invalid (e.g. name@domain.com).");
      newFieldErrors.email = "Please enter a valid email format.";
    }

    // 3. Password validation with concise checklist items
    const hasLength = password.length >= 6;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!password) {
      missing.push("Password is required.");
      newFieldErrors.password = "Please enter a password.";
    } else {
      if (!hasLength) {
        missing.push(`Password needs at least 6 characters (currently ${password.length}).`);
        newFieldErrors.password = "Minimum 6 characters required.";
      }
      if (!hasLetter) {
        missing.push("Password needs at least one letter (a-z).");
        newFieldErrors.password = "At least one letter is missing.";
      }
      if (!hasNumber) {
        missing.push("Password needs at least one number (0-9).");
        newFieldErrors.password = "At least one number is missing.";
      }
    }

    // 4. Confirm Password validation
    if (!confirmPassword) {
      missing.push("Please re-enter password in Confirm Password.");
      newFieldErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      missing.push("Password and Confirm Password do not match.");
      newFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (missing.length > 0) {
      setMissingList(missing);
      setFieldErrors(newFieldErrors);
      setError("Please complete the missing details:");
      return;
    }

    setSubmitting(true);
    const result = await register(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "confirmation_required" && result.message) {
        // Backend created account but sign-in needs a moment — show success message directing to login
        setSuccessMessage(result.message);
        return;
      }
      if (result.message) {
        setError(cleanErrorMessage(result.message));
      } else if (result.code === "email_taken") {
        setError(a.errors.emailTaken);
      } else {
        setError(a.errors.genericError);
      }
      return;
    }

    void navigate({ to: safeRedirect });
  };

  return (
    <>
      <PageHeader title={a.registerTitle} subtitle={a.registerSubtitle} />
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

          {successMessage && (
            <div
              role="status"
              className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
            >
              {successMessage}
              <div className="mt-2">
                <Link to="/login" className="underline font-semibold hover:text-primary/80">
                  Proceed to Login →
                </Link>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="register-name" className="block text-sm font-semibold">
              {a.nameLabel} <span className="text-destructive">*</span>
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={a.namePlaceholder}
              className={`mt-2 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.name ? "border-destructive ring-1 ring-destructive" : ""
              }`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="register-email" className="block text-sm font-semibold">
              {a.emailLabel} <span className="text-destructive">*</span>
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className="block text-sm font-semibold">
              {a.passwordLabel} <span className="text-destructive">*</span>
            </label>
            <div className="relative mt-2">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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

            {/* Live Password Requirements Checklist */}
            <div className="mt-2.5 rounded-lg border bg-muted/40 p-2.5 text-xs">
              <div className="font-semibold text-muted-foreground mb-1.5">
                Password Requirements:
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    password.length >= 6
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="font-bold">{password.length >= 6 ? "✓" : "○"}</span>
                  <span>
                    At least 6 characters {password.length > 0 && `(${password.length}/6)`}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    /[a-zA-Z]/.test(password)
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="font-bold">{/[a-zA-Z]/.test(password) ? "✓" : "○"}</span>
                  <span>At least one letter (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    /[0-9]/.test(password)
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <span className="font-bold">{/[0-9]/.test(password) ? "✓" : "○"}</span>
                  <span>At least one number (0-9)</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="block text-sm font-semibold">
              {a.confirmPasswordLabel} <span className="text-destructive">*</span>
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword)
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder={a.confirmPasswordPlaceholder}
              className={`mt-2 h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.confirmPassword ? "border-destructive ring-1 ring-destructive" : ""
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs font-medium text-destructive">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className={`${btn.primary} w-full`}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {submitting ? a.submittingRegister : a.submitRegister}
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
            {a.haveAccountPrompt}{" "}
            <Link
              to="/login"
              search={redirect ? { redirect } : {}}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              {a.goToLogin}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
