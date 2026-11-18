import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/components/site/AuthGate";
import { AuthProvider } from "@/lib/auth/context";
import {
  authenticateUser,
  readSessionCookie,
  registerUser,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/store.server";
import { LanguageProvider } from "@/lib/i18n";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    search?: unknown;
    children?: ReactNode;
  }) => (
    <a href={to ?? "#"} {...rest}>
      {children}
    </a>
  ),
  useRouterState: () => "/schemes",
}));

describe("Server auth store & session signing", () => {
  it("registers a new user, blocks duplicate email, and authenticates credentials", () => {
    const uniqueEmail = `farmer-${crypto.randomUUID()}@example.com`;

    const created = registerUser({
      name: "Ramesh Kumar",
      email: uniqueEmail,
      password: "secret-password",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.user.name).toBe("Ramesh Kumar");
    expect(created.user.email).toBe(uniqueEmail);

    const duplicate = registerUser({
      name: "Another User",
      email: uniqueEmail.toUpperCase(),
      password: "another-password",
    });
    expect(duplicate).toEqual({ ok: false, code: "email_taken", status: 409 });

    const validLogin = authenticateUser({ email: uniqueEmail, password: "secret-password" });
    expect(validLogin.ok).toBe(true);

    const badPassword = authenticateUser({ email: uniqueEmail, password: "wrong-password" });
    expect(badPassword).toEqual({ ok: false, code: "invalid_credentials", status: 401 });
  });

  it("signs and verifies session cookies and rejects tampered tokens", () => {
    const token = signSessionToken({ id: "u-1", name: "Sita Devi", email: "sita@example.com" });
    const verified = verifySessionToken(token);
    expect(verified).toEqual({ id: "u-1", name: "Sita Devi", email: "sita@example.com" });

    const req = new Request("http://localhost:3000/api/auth", {
      headers: { cookie: `ks-session=${token}` },
    });
    expect(readSessionCookie(req)).toEqual({
      id: "u-1",
      name: "Sita Devi",
      email: "sita@example.com",
    });

    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });
});

describe("RequireAuth route gate", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("blocks scheme content and prompts Login/Register when unauthenticated", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <LanguageProvider>
        <AuthProvider>
          <RequireAuth>
            <div>Protected Scheme Content</div>
          </RequireAuth>
        </AuthProvider>
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-required-gate")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected Scheme Content")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", "/register");
  });

  it("renders scheme content when authenticated", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { id: "u-1", name: "Ramesh Kumar", email: "ramesh@example.com" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <LanguageProvider>
        <AuthProvider>
          <RequireAuth>
            <div>Protected Scheme Content</div>
          </RequireAuth>
        </AuthProvider>
      </LanguageProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Scheme Content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("auth-required-gate")).not.toBeInTheDocument();
  });
});
