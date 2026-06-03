import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

export const SESSION_COOKIE_NAME = "finanza_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const PASSWORD_HASH_PREFIX = "scrypt$";

export type SessionPayload = {
  expiresAt: number;
  username: string;
};

export type AuthUser = {
  password: string;
  username: string;
};

export function getAuthUsers() {
  const rawUsers =
    process.env.FINANZA_AUTH_USERS ?? process.env.APP_AUTH_USERS ?? "";

  return rawUsers
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseUserEntry)
    .filter((user): user is AuthUser => Boolean(user));
}

export function isAuthConfigured() {
  return Boolean(getSessionSecret() && getAuthUsers().length > 0);
}

export function verifyCredentials(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const user = getAuthUsers().find(
    (candidate) => normalizeUsername(candidate.username) === normalizedUsername,
  );

  if (!user || !verifyPassword(password, user.password)) {
    return null;
  }

  return { username: user.username };
}

export function createSessionToken(username: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("FINANZA_SESSION_SECRET no esta configurada.");
  }

  const payload = encodeBase64Url(
    JSON.stringify({
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      username,
    } satisfies SessionPayload),
  );
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  const secret = getSessionSecret();

  if (!token || !secret) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as Partial<SessionPayload>;

    if (
      typeof session.username !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      expiresAt: session.expiresAt,
      username: session.username,
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}

export function sanitizeRedirectPath(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/login")) {
    return "/";
  }

  return value;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");

  return `${PASSWORD_HASH_PREFIX}${salt}$${hash}`;
}

function parseUserEntry(entry: string) {
  const colonIndex = entry.indexOf(":");
  const equalsIndex = entry.indexOf("=");
  const separatorIndex =
    colonIndex === -1
      ? equalsIndex
      : equalsIndex === -1
        ? colonIndex
        : Math.min(colonIndex, equalsIndex);

  if (separatorIndex <= 0) {
    return null;
  }

  const username = entry.slice(0, separatorIndex).trim();
  const password = entry.slice(separatorIndex + 1);

  if (!username || !password) {
    return null;
  }

  return { password, username };
}

function verifyPassword(password: string, configuredPassword: string) {
  if (configuredPassword.startsWith(PASSWORD_HASH_PREFIX)) {
    const [, salt, expectedHash] = configuredPassword.split("$");

    if (!salt || !expectedHash) {
      return false;
    }

    const hash = scryptSync(password, salt, 64).toString("base64url");

    return safeEqual(hash, expectedHash);
  }

  return safeEqual(password, configuredPassword);
}

function getSessionSecret() {
  return (
    process.env.FINANZA_SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET
  );
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(a: string, b: string) {
  const aHash = createHash("sha256").update(a).digest();
  const bHash = createHash("sha256").update(b).digest();

  return timingSafeEqual(aHash, bHash) && a === b;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}
