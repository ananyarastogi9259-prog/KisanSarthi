import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  authenticateUser,
  readSessionCookie,
  registerUser,
  signSessionToken,
} from "@/lib/auth/store.server";

const registerSchema = z.object({
  action: z.literal("register"),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128),
});

const logoutSchema = z.object({
  action: z.literal("logout"),
});

const bodySchema = z.discriminatedUnion("action", [registerSchema, loginSchema, logoutSchema]);

function buildSessionCookie(
  token: string,
  isHttps: boolean,
  maxAge = SESSION_MAX_AGE_SECONDS,
): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps ? "; Secure" : ""}`;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });

  if (request.method === "GET") {
    const user = readSessionCookie(request);
    return reply({ user });
  }

  if (request.method !== "POST") {
    return reply({ error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return reply({ error: "Cross-origin requests are not allowed." }, 403);
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return reply({ error: "invalid_input" }, 400);
    }
    parsedBody = parsed.data;
  } catch {
    return reply({ error: "invalid_input" }, 400);
  }

  const isHttps = url.protocol === "https:";

  if (parsedBody.action === "logout") {
    headers.set("Set-Cookie", buildSessionCookie("", isHttps, 0));
    return reply({ user: null });
  }

  if (parsedBody.action === "register") {
    const result = registerUser({
      name: parsedBody.name,
      email: parsedBody.email,
      password: parsedBody.password,
    });
    if (!result.ok) {
      return reply({ error: result.code }, result.status);
    }
    const token = signSessionToken(result.user);
    headers.set("Set-Cookie", buildSessionCookie(token, isHttps));
    return reply({ user: result.user }, 201);
  }

  const result = authenticateUser({
    email: parsedBody.email,
    password: parsedBody.password,
  });
  if (!result.ok) {
    return reply({ error: result.code }, result.status);
  }
  const token = signSessionToken(result.user);
  headers.set("Set-Cookie", buildSessionCookie(token, isHttps));
  return reply({ user: result.user });
}

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
