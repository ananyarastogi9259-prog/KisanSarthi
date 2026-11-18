import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface StoredUser extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

interface StoreFile {
  secret: string;
  users: StoredUser[];
}

export const SESSION_COOKIE_NAME = "ks-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DATA_DIR = path.resolve(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "auth-users.json");

let memoryStore: StoreFile | null = null;

function readStore(): StoreFile {
  if (memoryStore) return memoryStore;
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<StoreFile>;
      if (typeof parsed.secret === "string" && Array.isArray(parsed.users)) {
        memoryStore = { secret: parsed.secret, users: parsed.users };
        return memoryStore;
      }
    }
  } catch {
    // Fall back cleanly if disk read fails.
  }

  const initial: StoreFile = {
    secret: process.env["AUTH_SESSION_SECRET"] || randomBytes(32).toString("hex"),
    users: [],
  };
  memoryStore = initial;
  writeStore(initial);
  return initial;
}

function writeStore(store: StoreFile): void {
  memoryStore = store;
  if (process.env["VITEST"]) return;
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Keep operating in-memory if filesystem is read-only.
  }
}

function getSecret(): string {
  return process.env["AUTH_SESSION_SECRET"] || readStore().secret;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; code: "email_taken"; status: 409 } {
  const store = readStore();
  const normalized = normalizeEmail(input.email);
  const exists = store.users.some((u) => u.email === normalized);
  if (exists) {
    return { ok: false, code: "email_taken", status: 409 };
  }

  const created: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: normalized,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };

  writeStore({
    ...store,
    users: [...store.users, created],
  });

  return {
    ok: true,
    user: { id: created.id, name: created.name, email: created.email },
  };
}

export function authenticateUser(input: {
  email: string;
  password: string;
}): { ok: true; user: AuthUser } | { ok: false; code: "invalid_credentials"; status: 401 } {
  const store = readStore();
  const normalized = normalizeEmail(input.email);
  const found = store.users.find((u) => u.email === normalized);
  if (!found || !verifyPassword(input.password, found.passwordHash)) {
    return { ok: false, code: "invalid_credentials", status: 401 };
  }
  return {
    ok: true,
    user: { id: found.id, name: found.name, email: found.email },
  };
}

interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  exp: number;
}

export function signSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!encoded || !sig) return null;

  try {
    const expectedSig = createHmac("sha256", getSecret()).update(encoded).digest();
    const actualSig = Buffer.from(sig, "base64url");
    if (actualSig.length !== expectedSig.length || !timingSafeEqual(actualSig, expectedSig)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return { id: payload.userId, name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}

export function readSessionCookie(request: Request): AuthUser | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return null;
  return verifySessionToken(raw);
}
