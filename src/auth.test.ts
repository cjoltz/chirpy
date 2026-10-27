import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import {
  checkPasswordHash,
  getBearerToken,
  hashPassword,
  makeJWT,
  validateJWT,
} from "./auth.js";
import { UnauthorizedError } from "./api/errors.js";
import jwt from "jsonwebtoken";
import type { Request } from "express";

describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword123!";
  let hash1: string;
  let hash2: string;
  let hash2Again: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
    hash2Again = await hashPassword(password2);
  });

  it("should start with $argon2", () => {
    expect(hash1).toMatch(/^\$argon2/);
    expect(hash2).toMatch(/^\$argon2/);
  });

  it("should salt hashing", () => {
    expect(hash2).not.toBe(hash2Again);
  });

  it("should throw on malformed hash", async () => {
    await expect(checkPasswordHash(password1, "not-a-hash")).rejects.toThrow();
  });

  it("return false on empty password", async () => {
    const result = await checkPasswordHash("", hash1);
    expect(result).toBe(false);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });

  it("should return false for the incorrect password", async () => {
    const result = await checkPasswordHash(password1, hash2);
    expect(result).toBe(false);
  });
});

describe("makeJWT", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a string with 3 parts", () => {
    // Arrange: set up inputs
    const token = makeJWT("user1", 60, "secret"); // act
    expect(token.split(".")).toHaveLength(3);
  });

  it("decodes to valid fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const now = Math.floor(Date.now() / 1000);

    const token = makeJWT("aValidUser", 67, "SuperSecret");
    const decoded = jwt.decode(token, { json: true });

    expect(decoded).toMatchObject({
      sub: "aValidUser",
      iss: "chirpy",
      iat: now,
      exp: now + 67,
    });
  });
});

describe("JWT Validation", () => {
  const userId1 = "user1";
  const tokenDurationSeconds = 100;
  const secret = "secret";

  const token = makeJWT(userId1, tokenDurationSeconds, secret);
  const tokenExpired = makeJWT(userId1, 0, secret);
  const tokenTampered = tamperPayload(token);

  it("returns correct userId for valid token", () => {
    const userId = validateJWT(token, secret);
    expect(userId).toBe(userId1);
  });

  it("throws error for expired token", () => {
    expect(() => validateJWT(tokenExpired, secret)).toThrow(UnauthorizedError);
  });

  it("throw error for tampered payload", () => {
    expect(() => validateJWT(tokenTampered, secret)).toThrow(UnauthorizedError);
  });

  it("throw error for incorrect secret", () => {
    expect(() => validateJWT(token, "badSecret")).toThrow(UnauthorizedError);
  });

  it("throws error for wrong issuer", () => {
    const tokenForeign = jwt.sign({ sub: userId1, iss: "not-chirpy" }, secret);
    expect(() => validateJWT(tokenForeign, secret)).toThrow(UnauthorizedError);
  });

  it("throws error for missing subject", () => {
    const tokenNoSub = jwt.sign({ iss: "chirpy" }, secret);
    expect(() => validateJWT(tokenNoSub, secret)).toThrow(UnauthorizedError);
  });

  it("throws error for forged subject", () => {
    const [header, payload, signature] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    claims.sub = "user2";
    const forgedPayload = Buffer.from(JSON.stringify(claims)).toString(
      "base64url",
    );
    const tokenForged = [header, forgedPayload, signature].join(".");

    expect(() => validateJWT(tokenForged, secret)).toThrow(UnauthorizedError);
  });

  it.each(["", "garbage", "a.b.c"])(
    "throws error for malformed token '%s'",
    (malformed) => {
      expect(() => validateJWT(malformed, secret)).toThrow(UnauthorizedError);
    },
  );
});

describe("JWT Expiration", () => {
  const userId1 = "user1";
  const secret = "secret";
  const start = new Date("2026-01-01T00:00:00Z");

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is still valid just before expiring", () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const token = makeJWT(userId1, 60, secret);

    vi.setSystemTime(start.getTime() + 59 * 1000);
    expect(validateJWT(token, secret)).toBe(userId1);
  });

  it("throws error once expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(start);
    const token = makeJWT(userId1, 60, secret);

    vi.setSystemTime(start.getTime() + 60 * 1000);
    expect(() => validateJWT(token, secret)).toThrow(UnauthorizedError);
  });
});

describe("getBearerToken", () => {
  function fakeReq(header?: string) {
    return { get: () => header } as unknown as Request;
  }

  it("Valid Authorization Header", () => {
    const req = fakeReq("Bearer abc");
    expect(getBearerToken(req)).toBe("abc");
  });

  it("Missing Authorization Header", () => {
    const req = fakeReq();
    expect(() => getBearerToken(req)).toThrow(UnauthorizedError);
  });

  it("Malformed Authorization Headers", () => {
    const req = fakeReq("Bearer abc 123");
    const req2 = fakeReq("Banana abc");
    expect(() => getBearerToken(req)).toThrow(UnauthorizedError);
    expect(() => getBearerToken(req2)).toThrow(UnauthorizedError);
  });
});

function tamperPayload(token: string): string {
  const [header, payload, signature] = token.split(".");
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"; // base64url alphabet
  const i = Math.floor(Math.random() * payload.length);
  let replacement: string;
  do {
    replacement = chars[Math.floor(Math.random() * chars.length)];
  } while (replacement === payload[i]);
  const tampered = payload.slice(0, i) + replacement + payload.slice(i + 1);
  return [header, tampered, signature].join(".");
}
