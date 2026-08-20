import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const ownerAuthUrl = new URL("../app/owner-auth.ts", import.meta.url);
const legacyAuthUrl = new URL("../app/chatgpt-auth.ts", import.meta.url);
const auth = await import(existsSync(ownerAuthUrl) ? ownerAuthUrl : legacyAuthUrl);
const { isBlogOwner } = auth;

test("owner email comparison is exact after lowercase normalization", () => {
  assert.equal(isBlogOwner("Guo@example.com", "guo@example.com"), true);
  assert.equal(isBlogOwner(" other@example.com ", "guo@example.com"), false);
  assert.equal(isBlogOwner("", "guo@example.com"), false);
  assert.equal(isBlogOwner("guo@example.com", undefined), false);
  assert.equal(isBlogOwner("", "   "), false);
});

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function signedToken(claims = {}, { kid = "owner-key", keys } = {}) {
  const keyPair = keys ?? await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const now = 1_787_155_200;
  const payload = {
    iss: "https://guoyue.cloudflareaccess.com",
    aud: ["blog-audience"],
    exp: now + 300,
    email: "owner@example.com",
    name: "Guo Yue",
    ...claims,
  };
  const encodedHeader = base64url(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const encodedPayload = base64url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keyPair.privateKey, Buffer.from(input));
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { token: `${input}.${Buffer.from(signature).toString("base64url")}`, publicJwk, keyPair, now };
}

function config(overrides = {}) {
  return {
    teamDomain: "guoyue.cloudflareaccess.com",
    audience: "blog-audience",
    ownerEmail: "owner@example.com",
    ...overrides,
  };
}

function jwksFetch(publicJwk, kid = "owner-key") {
  return async (url) => {
    assert.equal(String(url), "https://guoyue.cloudflareaccess.com/cdn-cgi/access/certs");
    return Response.json({ keys: [{ ...publicJwk, kid, use: "sig", alg: "RS256" }] });
  };
}

test("accepts a signed Access JWT for the configured owner", async () => {
  assert.equal(typeof auth.verifyAccessJwt, "function");
  const fixture = await signedToken();
  const owner = await auth.verifyAccessJwt(fixture.token, config(), jwksFetch(fixture.publicJwk), fixture.now);
  assert.deepEqual(owner, { displayName: "Guo Yue", email: "owner@example.com", fullName: "Guo Yue" });
});

test("accepts an audience string as well as the Access audience array", async () => {
  const fixture = await signedToken({ aud: "blog-audience" });
  const owner = await auth.verifyAccessJwt(fixture.token, config(), jwksFetch(fixture.publicJwk), fixture.now);
  assert.equal(owner.email, "owner@example.com");
});

test("rejects a token signed by a key that is not in the team JWKS", async () => {
  const fixture = await signedToken();
  const other = await signedToken();
  await assert.rejects(
    auth.verifyAccessJwt(fixture.token, config(), jwksFetch(other.publicJwk), fixture.now),
    (error) => error?.status === 401,
  );
});

for (const [name, claims] of [
  ["wrong issuer", { iss: "https://other.cloudflareaccess.com" }],
  ["wrong audience", { aud: ["other-audience"] }],
  ["expired token", { exp: 1_787_155_199 }],
]) {
  test(`rejects ${name}`, async () => {
    const fixture = await signedToken(claims);
    await assert.rejects(
      auth.verifyAccessJwt(fixture.token, config(), jwksFetch(fixture.publicJwk), fixture.now),
      (error) => error?.status === 401,
    );
  });
}

test("rejects a valid Access identity that is not the configured owner", async () => {
  const fixture = await signedToken({ email: "other@example.com" });
  await assert.rejects(
    auth.verifyAccessJwt(fixture.token, config(), jwksFetch(fixture.publicJwk), fixture.now),
    (error) => error?.status === 403,
  );
});

test("rejects malformed tokens and incomplete configuration", async () => {
  await assert.rejects(auth.verifyAccessJwt("not-a-jwt", config()), (error) => error?.status === 401);
  const fixture = await signedToken();
  await assert.rejects(
    auth.verifyAccessJwt(fixture.token, config({ audience: "" }), jwksFetch(fixture.publicJwk), fixture.now),
    (error) => error?.status === 401,
  );
});

test("ignores legacy GPT identity headers when no Access assertion exists", async () => {
  assert.equal(typeof auth.ownerFromHeaders, "function");
  const headers = new Headers({ "oai-authenticated-user-email": "owner@example.com" });
  assert.equal(await auth.ownerFromHeaders(headers, config()), null);
});
