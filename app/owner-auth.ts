import { headers } from "next/headers.js";
import { notFound } from "next/navigation.js";

export type OwnerUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export type AccessAuthConfig = {
  teamDomain: string;
  audience: string;
  ownerEmail: string;
};

type AccessClaims = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  email?: unknown;
  name?: unknown;
};

type JwksResponse = { keys?: JsonWebKey[] };
type Fetcher = (input: string | URL | Request) => Promise<Response>;

export class BlogAuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "BlogAuthError";
    this.status = status;
  }
}

export function isBlogOwner(userEmail: string, ownerEmail: string | undefined): boolean {
  if (!ownerEmail?.trim()) return false;
  return userEmail.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}

function issuerFor(teamDomain: string): string {
  const value = teamDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!value || !/^[a-z0-9.-]+$/i.test(value)) throw new BlogAuthError(401, "站点身份配置无效");
  return `https://${value}`;
}

function decodePart(value: string): Uint8Array {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new BlogAuthError(401, "登录凭证无效");
  }
}

function parseJsonPart<T>(value: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(decodePart(value))) as T;
  } catch {
    throw new BlogAuthError(401, "登录凭证无效");
  }
}

function hasAudience(value: unknown, expected: string): boolean {
  return value === expected || (Array.isArray(value) && value.some((item) => item === expected));
}

export async function verifyAccessJwt(
  token: string,
  config: AccessAuthConfig,
  fetcher: Fetcher = fetch,
  now = Math.floor(Date.now() / 1000),
): Promise<OwnerUser> {
  if (!config.audience.trim() || !config.ownerEmail.trim()) throw new BlogAuthError(401, "站点身份配置无效");
  const issuer = issuerFor(config.teamDomain);
  const parts = token.split(".");
  if (parts.length !== 3) throw new BlogAuthError(401, "登录凭证无效");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJsonPart<{ alg?: unknown; kid?: unknown }>(encodedHeader);
  const claims = parseJsonPart<AccessClaims>(encodedPayload);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new BlogAuthError(401, "登录凭证无效");

  let jwks: JwksResponse;
  try {
    const response = await fetcher(`${issuer}/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error("JWKS request failed");
    jwks = await response.json() as JwksResponse;
  } catch {
    throw new BlogAuthError(401, "无法验证登录凭证");
  }
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new BlogAuthError(401, "登录凭证无效");
  let verified = false;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decodePart(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    verified = false;
  }
  if (!verified) throw new BlogAuthError(401, "登录凭证无效");
  if (claims.iss !== issuer || !hasAudience(claims.aud, config.audience) || typeof claims.exp !== "number" || claims.exp <= now || typeof claims.email !== "string") {
    throw new BlogAuthError(401, "登录凭证无效");
  }
  if (!isBlogOwner(claims.email, config.ownerEmail)) throw new BlogAuthError(403, "无权修改此博客");
  const fullName = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : null;
  return { displayName: fullName ?? claims.email, email: claims.email, fullName };
}

function environmentConfig(): AccessAuthConfig {
  return {
    teamDomain: process.env.CF_ACCESS_TEAM_DOMAIN ?? "",
    audience: process.env.CF_ACCESS_AUD ?? "",
    ownerEmail: process.env.BLOG_OWNER_EMAIL ?? "",
  };
}

export async function ownerFromHeaders(
  requestHeaders: Headers,
  config: AccessAuthConfig = environmentConfig(),
  fetcher: Fetcher = fetch,
): Promise<OwnerUser | null> {
  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!token) return null;
  return verifyAccessJwt(token, config, fetcher);
}

export async function getOwnerUser(): Promise<OwnerUser | null> {
  if (process.env.NODE_ENV !== "production" && process.env.OWNER_AUTH_DEV_BYPASS === "true") {
    const email = process.env.BLOG_OWNER_EMAIL?.trim();
    if (email) return { displayName: email, email, fullName: null };
  }
  return ownerFromHeaders(await headers());
}

export async function requireBlogOwner(_returnTo = "/editor"): Promise<OwnerUser> {
  void _returnTo;
  const user = await getOwnerUser();
  if (!user) notFound();
  return user;
}

export async function assertBlogOwner(): Promise<OwnerUser> {
  const user = await getOwnerUser();
  if (!user) throw new BlogAuthError(401, "请先登录");
  return user;
}
